/**
 * The web app's voice (a VoiceClient for @codearchy/ui): the system voice
 * (Web Speech, instant) and Kokoro-82M, a neural voice that runs in a worker
 * on this device. Kokoro is opt-in: the ~107 MB model is served by this app
 * (never a third party), downloaded once, then cached by the browser.
 *
 * Until Kokoro is ready, speech uses the system voice, so narration never
 * waits on a download.
 */
import type { KokoroState, SpeakOptions, VoiceClient, VoiceEngineInfo, VoiceOption, VoiceState } from '@codearchy/ui';
import manifest from './model.json';

const REV = manifest.revision.slice(0, 8);
const MODEL_BASE = `/voice/${REV}/`;
const ORT_BASE = '/voice/ort/';
const DOWNLOAD_BYTES = Object.values(manifest.files as Record<string, { size: number }>).reduce((n, f) => n + f.size, 0);
const HF_MODEL = 'https://huggingface.co/onnx-community/Kokoro-82M-v1.0-ONNX/resolve/main/onnx/model_quantized.onnx';
const STORE = 'codearchy.voice';
const DEFAULT_KOKORO = 'af_heart';

const ACCENT: Record<string, string> = { a: 'American', b: 'British' };
const KOKORO_VOICES: VoiceOption[] = Object.keys(manifest.files)
    .filter((f) => f.startsWith('voices/'))
    .map((f) => f.slice(7, -4))
    .map((id) => ({
        id,
        label: id.slice(3).replace(/^./, (c) => c.toUpperCase()),
        detail: `${ACCENT[id[0]!] ?? 'English'} ${id[1] === 'f' ? 'Female' : 'Male'}`,
        lang: id[0] === 'b' ? 'en-GB' : 'en-US',
    }))
    .sort((a, b) => (a.detail ?? '').localeCompare(b.detail ?? '') || a.label.localeCompare(b.label));

type Saved = { engine: 'system' | 'kokoro'; voice?: string; rate: number };

function load(): Saved {
    try {
        const raw = JSON.parse(localStorage.getItem(STORE) ?? 'null') as Partial<Saved> | null;
        if (raw && (raw.engine === 'system' || raw.engine === 'kokoro')) return { engine: raw.engine, ...(typeof raw.voice === 'string' ? { voice: raw.voice } : {}), rate: typeof raw.rate === 'number' ? raw.rate : 1 };
    } catch {
        // storage blocked: defaults
    }
    return { engine: 'system', rate: 1 };
}

function save(s: Saved): void {
    try {
        localStorage.setItem(STORE, JSON.stringify(s));
    } catch {
        // storage blocked: settings last for this tab
    }
}

export function webVoiceClient(): VoiceClient {
    const synth = typeof speechSynthesis !== 'undefined' ? speechSynthesis : undefined;
    let saved = load();
    let kokoro: KokoroState = { status: 'idle', downloadBytes: DOWNLOAD_BYTES };
    let served: boolean | undefined;
    let speaking = false;
    let preparing = false;
    let state: VoiceState;
    const listeners = new Set<(s: VoiceState) => void>();

    const systemVoices = (): VoiceOption[] =>
        (synth?.getVoices() ?? [])
            .map((v) => ({ id: v.voiceURI, label: v.name, detail: v.lang, lang: v.lang }))
            .sort((a, b) => Number(!a.lang.startsWith('en')) - Number(!b.lang.startsWith('en')) || a.lang.localeCompare(b.lang) || a.label.localeCompare(b.label));

    const compute = (): VoiceState => {
        const engines: VoiceEngineInfo[] = [
            {
                id: 'kokoro',
                label: 'Natural voice (Kokoro)',
                description: 'A neural voice that runs on this device. Downloaded once from this app, then works offline.',
                available: served !== false,
                ...(served === false ? { reason: 'This server doesn’t serve the voice model (run `pnpm voice` in development).' } : {}),
            },
            { id: 'system', label: 'System voice', description: 'Your browser’s and operating system’s voices. Instant, no download.', available: !!synth, ...(synth ? {} : { reason: 'Speech synthesis isn’t available in this browser.' }) },
        ];
        return {
            engine: saved.engine,
            ...(saved.voice ? { voice: saved.voice } : {}),
            rate: saved.rate,
            engines,
            voices: saved.engine === 'kokoro' ? KOKORO_VOICES : systemVoices(),
            kokoro,
            speaking,
            preparing,
        };
    };
    const emit = () => {
        state = compute();
        for (const l of listeners) l(state);
    };
    state = compute();
    if (synth) synth.addEventListener?.('voiceschanged', emit);

    // Is the model served here, and already in this browser's cache?
    void fetch(`${MODEL_BASE}config.json`, { method: 'HEAD', cache: 'no-store' }).then(
        (r) => {
            served = r.ok && !(r.headers.get('content-type') ?? '').includes('text/html');
            if (!served) kokoro = { status: 'unavailable', error: 'Not served here' };
            emit();
        },
        () => ((served = false), (kokoro = { status: 'unavailable', error: 'Not served here' }), emit())
    );

    // ── Kokoro worker ──────────────────────────────────────────────────────
    let worker: Worker | undefined;
    let ready: Promise<void> | undefined;
    const prepare = (): Promise<void> => {
        if (ready) return ready;
        if (served === false) return Promise.reject(new Error('The voice model is not served here'));
        kokoro = { ...kokoro, status: kokoro.cached ? 'loading' : 'downloading', progress: 0 };
        emit();
        ready = new Promise<void>((resolve, reject) => {
            worker = new Worker(new URL('./kokoro.worker.ts', import.meta.url), { type: 'module' });
            worker.addEventListener('message', (ev: MessageEvent<{ type: string; percent?: number; device?: 'wasm' | 'webgpu'; message?: string; id?: number }>) => {
                const m = ev.data;
                if (m.type === 'progress') {
                    kokoro = { ...kokoro, progress: m.percent ?? 0, status: (m.percent ?? 0) >= 95 ? 'loading' : kokoro.status };
                    emit();
                } else if (m.type === 'ready') {
                    kokoro = { status: 'ready', device: m.device ?? 'wasm', cached: true, downloadBytes: DOWNLOAD_BYTES };
                    emit();
                    resolve();
                } else if (m.type === 'error' && m.id === undefined) {
                    kokoro = { ...kokoro, status: 'error', error: m.message ?? 'unknown error' };
                    ready = undefined;
                    worker?.terminate();
                    worker = undefined;
                    emit();
                    reject(new Error(m.message));
                }
            });
            worker.addEventListener('message', onAudio);
            worker.postMessage({ type: 'init', base: new URL(MODEL_BASE, location.href).href, ort: new URL(ORT_BASE, location.href).href });
        });
        return ready;
    };

    // ── playback ───────────────────────────────────────────────────────────
    let audio: AudioContext | undefined;
    let current: { id: number; options?: SpeakOptions; next: number; sources: Set<AudioBufferSourceNode>; ended: boolean } | undefined;
    let nextId = 1;

    const finish = (id: number, error?: Error) => {
        if (!current || current.id !== id) return;
        const { options } = current;
        current = undefined;
        speaking = false;
        preparing = false;
        emit();
        if (error) options?.onError?.(error);
        else options?.onEnd?.();
    };

    function onAudio(ev: MessageEvent<{ type: string; id?: number; pcm?: Float32Array; sampleRate?: number; message?: string }>): void {
        const m = ev.data;
        if (!current || m.id !== current.id) return;
        if (m.type === 'chunk' && m.pcm && m.sampleRate && audio) {
            const buf = audio.createBuffer(1, m.pcm.length, m.sampleRate);
            buf.copyToChannel(m.pcm as Float32Array<ArrayBuffer>, 0);
            const src = audio.createBufferSource();
            src.buffer = buf;
            src.connect(audio.destination);
            const at = Math.max(audio.currentTime + 0.02, current.next);
            src.start(at);
            current.next = at + buf.duration;
            current.sources.add(src);
            const turn = current;
            src.onended = () => {
                turn.sources.delete(src);
                if (turn.ended && turn.sources.size === 0) finish(turn.id);
            };
            if (preparing || !speaking) {
                preparing = false;
                speaking = true;
                emit();
            }
        } else if (m.type === 'end') {
            current.ended = true;
            if (current.sources.size === 0) finish(current.id);
        } else if (m.type === 'error') {
            finish(current.id, new Error(m.message ?? 'Speech failed'));
        }
    }

    const speakSystem = (id: number, text: string) => {
        if (!synth) return finish(id, new Error('Speech synthesis isn’t available'));
        const u = new SpeechSynthesisUtterance(text);
        u.rate = saved.rate;
        const v = saved.engine === 'system' && saved.voice ? synth.getVoices().find((x) => x.voiceURI === saved.voice) : synth.getVoices().find((x) => x.lang.startsWith('en') && x.default) ?? undefined;
        if (v) (u.voice = v), (u.lang = v.lang);
        u.onstart = () => {
            if (current?.id !== id) return;
            preparing = false;
            speaking = true;
            emit();
        };
        u.onend = () => finish(id);
        u.onerror = (e) => (e.error === 'interrupted' || e.error === 'canceled' ? finish(id) : finish(id, new Error(e.error)));
        // Chrome drops an utterance queued in the same tick as cancel().
        setTimeout(() => current?.id === id && synth.speak(u), 50);
    };

    const stop = () => {
        const was = current;
        current = undefined;
        worker?.postMessage({ type: 'stop' });
        if (was) for (const s of was.sources) s.stop();
        synth?.cancel();
        if (speaking || preparing) {
            speaking = false;
            preparing = false;
            emit();
        }
        was?.options?.onEnd?.();
    };

    // Already in this browser's cache? Then it loads (no download) when it's the chosen voice.
    void (async () => {
        try {
            const cached = !!(await (await caches.open('transformers-cache')).match(HF_MODEL));
            if (cached && kokoro.status === 'idle') {
                kokoro = { ...kokoro, cached: true };
                emit();
                if (saved.engine === 'kokoro') void prepare().catch(() => undefined);
            }
        } catch {
            // no Cache Storage (private mode): it downloads when asked
        }
    })();

    return {
        state: () => state,
        subscribe: (l) => {
            listeners.add(l);
            return () => listeners.delete(l);
        },
        update: (patch) => {
            saved = { ...saved, ...patch, ...('voice' in patch && !patch.voice ? { voice: undefined } : {}) };
            if (!saved.voice) delete saved.voice;
            saved.rate = Math.min(2, Math.max(0.5, saved.rate));
            save(saved);
            emit();
            if (saved.engine === 'kokoro' && kokoro.cached && kokoro.status === 'idle') void prepare().catch(() => undefined);
        },
        prepareKokoro: prepare,
        speak: (text, options) => {
            stop();
            const id = nextId++;
            current = { id, ...(options ? { options } : {}), next: 0, sources: new Set(), ended: false };
            preparing = true;
            emit();
            if (saved.engine === 'kokoro' && kokoro.status === 'ready' && worker) {
                audio ??= new AudioContext();
                void audio.resume();
                current.next = audio.currentTime;
                worker.postMessage({ type: 'speak', id, text, voice: saved.voice ?? DEFAULT_KOKORO, speed: saved.rate });
            } else {
                // The natural voice is still on its way (or not chosen): the system voice now.
                if (saved.engine === 'kokoro' && kokoro.cached && kokoro.status === 'idle') void prepare().catch(() => undefined);
                speakSystem(id, text);
            }
        },
        stop,
    };
}
