/**
 * The web app's voice (a VoiceClient for @codearchy/ui): the system voice
 * (Web Speech, instant) and Kokoro-82M, a neural voice that runs in a worker
 * on this device. Kokoro is opt-in: the ~107 MB model is served by this app
 * (never a third party), downloaded once, then cached by the browser.
 *
 * Kokoro's audio can be kept: the shared Narrator asks for tour steps ahead
 * of time (`synthesize`), keeps them, and plays them back (`play`), so the
 * next step speaks at once. Speech that is streamed (`speak`) is handed back
 * whole (`onAudio`) to be kept too. Until Kokoro is ready, speech uses the
 * system voice, so narration never waits on a download.
 */
import type { KokoroState, SpeakOptions, SynthesisPriority, VoiceAudio, VoiceClient, VoiceEngineInfo, VoiceOption, VoiceState } from '@codearchy/ui';
import manifest from './model.json';
import { VOICE_GPU, VOICE_SERVED } from '../generated/voice';

const REV = manifest.revision.slice(0, 8);
const MODEL_BASE = `/voice/${REV}/`;
const ORT_BASE = '/voice/ort/';
type ModelFile = { size: number; gpu?: boolean };
const FILES = Object.entries(manifest.files as Record<string, ModelFile>);
/** What each mode downloads: the GPU one swaps the q8 model for the fp32 one. */
const BYTES = {
    cpu: FILES.filter(([, f]) => !f.gpu).reduce((n, [, f]) => n + f.size, 0),
    gpu: FILES.filter(([rel]) => rel !== 'onnx/model_quantized.onnx').reduce((n, [, f]) => n + f.size, 0),
};
const HF = 'https://huggingface.co/onnx-community/Kokoro-82M-v1.0-ONNX/resolve/main/';
const MODE = {
    cpu: { dtype: 'q8', device: 'wasm', model: `${HF}onnx/model_quantized.onnx` },
    gpu: { dtype: 'fp32', device: 'webgpu', model: `${HF}onnx/model.onnx` },
} as const;
type Mode = keyof typeof MODE;

/** WebGPU with a real adapter, and the fp32 model served here. */
async function gpuUsable(): Promise<boolean> {
    try {
        const gpu = (navigator as Navigator & { gpu?: { requestAdapter(): Promise<unknown> } }).gpu;
        return VOICE_GPU && !!gpu && !!(await gpu.requestAdapter());
    } catch {
        return false;
    }
}
const STORE = 'codearchy.voice';
const DEFAULT_KOKORO = 'af_heart';
const RANK: Record<SynthesisPriority, number> = { now: 0, soon: 1, later: 2 };

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

/** A job in the worker: speech being streamed, or audio made ahead. */
interface Job {
    id: number;
    text: string;
    rank: number;
    /** `synthesize` callers waiting for the whole audio. */
    waiters: Array<(a: VoiceAudio | undefined) => void>;
}

export function webVoiceClient(): VoiceClient {
    const synth = typeof speechSynthesis !== 'undefined' ? speechSynthesis : undefined;
    let saved = load();
    /** Known at build time: this server has the voice model (no probing for a file that may 404). */
    const served = VOICE_SERVED;
    /** CPU until WebGPU is known to work here (decided before anything is downloaded). */
    let mode: Mode = 'cpu';
    const decided = gpuUsable().then((ok) => {
        if (ok) mode = 'gpu';
        if (kokoro.status === 'idle') (kokoro = { ...kokoro, downloadBytes: BYTES[mode] }), emit();
    });
    let kokoro: KokoroState = served ? { status: 'idle', downloadBytes: BYTES.cpu } : { status: 'unavailable', error: 'Not served here' };
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
                description: `A neural voice that runs on this device${mode === 'gpu' ? ' (on its GPU)' : ''}. Downloaded once from this app, then works offline. Tour steps are made ahead and kept, so they play at once.`,
                available: served,
                ...(!served ? { reason: 'This server doesn’t serve the voice model (run `pnpm voice` in development).' } : {}),
            },
            { id: 'system', label: 'System voice', description: 'Your browser’s and operating system’s voices. Instant, no download.', available: !!synth, ...(synth ? {} : { reason: 'Speech synthesis isn’t available in this browser.' }) },
        ];
        return { engine: saved.engine, ...(saved.voice ? { voice: saved.voice } : {}), rate: saved.rate, engines, voices: saved.engine === 'kokoro' ? KOKORO_VOICES : systemVoices(), kokoro, speaking, preparing };
    };
    const emit = () => {
        state = compute();
        for (const l of listeners) l(state);
    };
    state = compute();
    if (synth) synth.addEventListener?.('voiceschanged', emit);

    // ── Kokoro worker ──────────────────────────────────────────────────────
    let worker: Worker | undefined;
    let ready: Promise<void> | undefined;
    let nextId = 1;
    const jobs = new Map<number, Job>();
    const kokoroVoice = () => (saved.engine === 'kokoro' && saved.voice ? saved.voice : DEFAULT_KOKORO);
    const usingKokoro = () => saved.engine === 'kokoro' && kokoro.status === 'ready' && !!worker;

    const prepare = (): Promise<void> => {
        if (ready) return ready;
        if (!served) return Promise.reject(new Error('The voice model is not served here'));
        kokoro = { ...kokoro, status: kokoro.cached ? 'loading' : 'downloading', progress: 0 };
        emit();
        ready = decided.then(() => start());
        return ready;
    };
    /** Starts the worker in the current mode; if the GPU fails to start, the CPU takes over. */
    const start = (): Promise<void> =>
        new Promise<void>((resolve, reject) => {
            const w = new Worker(new URL('./kokoro.worker.ts', import.meta.url), { type: 'module' });
            worker = w;
            w.addEventListener('message', (ev: MessageEvent<{ type: string; percent?: number; device?: 'wasm' | 'webgpu'; message?: string; id?: number }>) => {
                const m = ev.data;
                if (m.type === 'progress') {
                    kokoro = { ...kokoro, progress: m.percent ?? 0, status: (m.percent ?? 0) >= 90 ? 'loading' : kokoro.status };
                    emit();
                } else if (m.type === 'ready') {
                    kokoro = { status: 'ready', device: m.device ?? 'wasm', cached: true, downloadBytes: BYTES[mode] };
                    emit();
                    resolve();
                } else if (m.type === 'error' && m.id === undefined && mode === 'gpu') {
                    w.terminate();
                    mode = 'cpu';
                    kokoro = { ...kokoro, status: 'downloading', progress: 0, downloadBytes: BYTES.cpu };
                    emit();
                    start().then(resolve, reject);
                } else if (m.type === 'error' && m.id === undefined) {
                    kokoro = { ...kokoro, status: 'error', error: m.message ?? 'unknown error' };
                    ready = undefined;
                    w.terminate();
                    worker = undefined;
                    for (const j of jobs.values()) j.waiters.forEach((r) => r(undefined));
                    jobs.clear();
                    emit();
                    reject(new Error(m.message));
                }
            });
            w.addEventListener('message', onWorker);
            w.postMessage({ type: 'init', base: new URL(MODEL_BASE, location.href).href, ort: new URL(ORT_BASE, location.href).href, voice: kokoroVoice(), dtype: MODE[mode].dtype, device: MODE[mode].device });
        });

    const send = (text: string, kind: 'stream' | 'make', rank: number): Job => {
        const job: Job = { id: nextId++, text, rank, waiters: [] };
        jobs.set(job.id, job);
        worker!.postMessage({ type: 'job', id: job.id, kind, rank, text, voice: kokoroVoice(), speed: saved.rate });
        return job;
    };
    /** A job already queued or running for this text (with the current voice and speed). */
    const findJob = (text: string) => [...jobs.values()].find((j) => j.text === text);

    // ── playback: one turn at a time (a stream, a kept clip, or the system voice) ──
    let ctx: AudioContext | undefined;
    const sources = new Set<AudioBufferSourceNode>();
    let at = 0;
    /** The current turn: who asked, the worker job it streams (if any), and whether all its audio is scheduled. */
    let turn: { options?: SpeakOptions; job?: number; complete: boolean; scheduled: boolean } | undefined;

    const audioContext = () => {
        ctx ??= new AudioContext();
        void ctx.resume();
        return ctx;
    };
    function schedule(pcm: Float32Array, sampleRate: number): void {
        const c = audioContext();
        const buf = c.createBuffer(1, pcm.length, sampleRate);
        buf.copyToChannel(pcm as Float32Array<ArrayBuffer>, 0);
        const src = c.createBufferSource();
        src.buffer = buf;
        src.connect(c.destination);
        const start = Math.max(c.currentTime + 0.02, at);
        src.start(start);
        at = start + buf.duration;
        sources.add(src);
        const mine = turn;
        if (mine) mine.scheduled = true;
        src.onended = () => {
            sources.delete(src);
            if (mine && mine === turn && mine.complete && !sources.size) end();
        };
        if (!speaking || preparing) {
            speaking = true;
            preparing = false;
            emit();
        }
    }
    /** The turn finished (or failed): tell whoever asked for it. */
    function end(error?: Error): void {
        const t = turn;
        turn = undefined;
        if (speaking || preparing) {
            speaking = false;
            preparing = false;
            emit();
        }
        if (error) t?.options?.onError?.(error);
        else t?.options?.onEnd?.();
    }
    function stop(): void {
        const t = turn;
        turn = undefined;
        // The stream keeps going in the background (the worker demotes it), so the step is kept for next time.
        if (t?.job !== undefined) worker?.postMessage({ type: 'cancel', kind: 'stream' });
        for (const s of sources) s.stop();
        sources.clear();
        synth?.cancel();
        if (speaking || preparing) {
            speaking = false;
            preparing = false;
            emit();
        }
        t?.options?.onEnd?.();
    }
    const begin = (options?: SpeakOptions) => {
        stop();
        turn = { ...(options ? { options } : {}), complete: false, scheduled: false };
        at = 0;
        preparing = true;
        emit();
        return turn;
    };

    function onWorker(ev: MessageEvent<{ type: string; id?: number; ids?: number[]; pcm?: Float32Array; sampleRate?: number; message?: string }>): void {
        const m = ev.data;
        const mine = turn && m.id !== undefined && turn.job === m.id ? turn : undefined;
        if (m.type === 'chunk' && mine && m.pcm && m.sampleRate) {
            schedule(m.pcm, m.sampleRate);
        } else if (m.type === 'done' && m.id !== undefined) {
            const job = jobs.get(m.id);
            jobs.delete(m.id);
            const whole = m.pcm && m.sampleRate ? { pcm: m.pcm, sampleRate: m.sampleRate } : undefined;
            job?.waiters.forEach((r) => r(whole));
            if (mine) {
                // The job finished just as it was promoted (no chunk was streamed): play it whole.
                if (whole && !mine.scheduled) schedule(whole.pcm, whole.sampleRate);
                if (whole) mine.options?.onAudio?.(whole);
                mine.complete = true;
                if (!sources.size) end();
            }
        } else if (m.type === 'dropped') {
            for (const id of m.ids ?? []) {
                jobs.get(id)?.waiters.forEach((r) => r(undefined));
                jobs.delete(id);
            }
        } else if (m.type === 'error' && m.id !== undefined) {
            jobs.get(m.id)?.waiters.forEach((r) => r(undefined));
            jobs.delete(m.id);
            if (mine) end(new Error(m.message ?? 'Speech failed'));
        }
    }

    const speakSystem = (text: string) => {
        const mine = turn;
        if (!synth) return end(new Error('Speech synthesis isn’t available'));
        const u = new SpeechSynthesisUtterance(text);
        u.rate = saved.rate;
        const v = saved.engine === 'system' && saved.voice ? synth.getVoices().find((x) => x.voiceURI === saved.voice) : synth.getVoices().find((x) => x.lang.startsWith('en') && x.default);
        if (v) (u.voice = v), (u.lang = v.lang);
        u.onstart = () => {
            if (mine !== turn) return;
            preparing = false;
            speaking = true;
            emit();
        };
        u.onend = () => mine === turn && end();
        u.onerror = (e) => mine === turn && (e.error === 'interrupted' || e.error === 'canceled' ? end() : end(new Error(e.error)));
        // Chrome drops an utterance queued in the same tick as cancel().
        setTimeout(() => mine === turn && synth.speak(u), 50);
    };

    // Already in this browser's cache? Then it loads (no download) when it's the chosen voice.
    void (async () => {
        try {
            if (!served) return;
            await decided;
            const cached = !!(await (await caches.open('transformers-cache')).match(MODE[mode].model));
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
            const before = `${kokoroVoice()}|${saved.rate}`;
            saved = { ...saved, ...patch, ...('voice' in patch && !patch.voice ? { voice: undefined } : {}) };
            if (!saved.voice) delete saved.voice;
            saved.rate = Math.min(2, Math.max(0.5, saved.rate));
            save(saved);
            // Another voice or speed: what's queued for the old one is no longer wanted.
            if (`${kokoroVoice()}|${saved.rate}` !== before) {
                worker?.postMessage({ type: 'cancel', kind: 'pending' });
                for (const [id, j] of jobs) if (id !== turn?.job) (j.waiters.forEach((r) => r(undefined)), jobs.delete(id));
            }
            emit();
            if (saved.engine === 'kokoro' && kokoro.cached && kokoro.status === 'idle') void prepare().catch(() => undefined);
        },
        prepareKokoro: prepare,
        speak: (text, options) => {
            const t = begin(options);
            if (!usingKokoro()) {
                // The natural voice is still on its way (or not chosen): the system voice now.
                if (saved.engine === 'kokoro' && kokoro.cached && kokoro.status === 'idle') void prepare().catch(() => undefined);
                return speakSystem(text);
            }
            audioContext();
            // Already being made ahead? Speak that job: what it has made plays at once.
            const queued = findJob(text);
            if (queued) {
                t.job = queued.id;
                worker!.postMessage({ type: 'promote', id: queued.id });
                return;
            }
            t.job = send(text, 'stream', 0).id;
        },
        stop,
        capturesSpeech: true,
        cacheKey: () => (usingKokoro() ? `kokoro:${REV}:${MODE[mode].dtype}:${kokoroVoice()}:${saved.rate}` : undefined),
        synthesize: (text, priority) => {
            if (!usingKokoro()) return Promise.resolve(undefined);
            const rank = RANK[priority];
            const job = findJob(text) ?? send(text, 'make', rank);
            if (rank < job.rank) {
                job.rank = rank;
                worker!.postMessage({ type: 'bump', id: job.id, rank });
            }
            return new Promise<VoiceAudio | undefined>((resolve) => job.waiters.push(resolve));
        },
        play: (clip, options) => {
            const t = begin(options);
            schedule(clip.pcm, clip.sampleRate);
            t.complete = true;
        },
        cancelPending: () => {
            worker?.postMessage({ type: 'cancel', kind: 'pending' });
        },
    };
}
