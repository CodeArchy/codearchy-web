/**
 * The web app's voice (a VoiceClient for @codearchy/ui): the system voice
 * (Web Speech, instant) and Kokoro-82M, a neural voice that runs on this
 * device. Kokoro is opt-in; its model is served by this app (never a third
 * party), downloaded once, then cached by the browser.
 *
 * Where WebGPU works, the GPU engine (fp32 model, ~1.5x faster than speech)
 * starts first, on its own: it usually serves everything within seconds.
 * When it's slow to start (a busy machine, a slow driver) or fails, the CPU
 * engine (q8, multi-threaded) stands in, doing only what's needed now or
 * next, and the GPU takes over when it's ready (phrases still queued on the
 * CPU move across). Without WebGPU, the CPU engine. Before any engine is
 * ready, speech uses the system voice: nothing ever waits.
 *
 * The shared SpeechEngine asks for phrases (`synthesize`, in priority order)
 * and plays and keeps them; this client only makes audio. Until Kokoro is
 * ready, speech uses the system voice, so it never waits on a download.
 */
import type { KokoroState, SpeakOptions, SynthesisPriority, VoiceAudio, VoiceClient, VoiceEngineInfo, VoiceOption, VoiceState } from '@codearchy/ui';
import manifest from './model.json';
import { VOICE_GPU, VOICE_SERVED } from '../generated/voice';

const REV = manifest.revision.slice(0, 8);
const MODEL_BASE = `/voice/${REV}/`;
const ORT_BASE = '/voice/ort/';
type ModelFile = { size: number; gpu?: boolean };
const FILES = Object.entries(manifest.files as Record<string, ModelFile>);
/** The CPU engine's download (q8 + voices); the GPU engine adds the fp32 model. */
const CPU_BYTES = FILES.filter(([, f]) => !f.gpu).reduce((n, [, f]) => n + f.size, 0);
const HF = 'https://huggingface.co/onnx-community/Kokoro-82M-v1.0-ONNX/resolve/main/';
const CPU_MODEL = `${HF}onnx/model_quantized.onnx`;
const GPU_MODEL = `${HF}onnx/model.onnx`;
const STORE = 'codearchy.voice';
const DEFAULT_KOKORO = 'af_heart';
const RANK: Record<SynthesisPriority, number> = { now: 0, soon: 1, later: 2 };
/** The GPU engine alone this long; slower than that, the CPU stands in until it's ready. */
const GPU_HEDGE_MS = 12_000;
/** The GPU engine gets this long in all; after that the CPU keeps the job for this session. */
const GPU_BUDGET_MS = 240_000;

/** WebGPU with a real adapter, and the fp32 model served here. */
async function gpuUsable(): Promise<boolean> {
    try {
        const gpu = (navigator as Navigator & { gpu?: { requestAdapter(): Promise<unknown> } }).gpu;
        return VOICE_GPU && !!gpu && !!(await gpu.requestAdapter());
    } catch {
        return false;
    }
}

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

type Out = { type: string; percent?: number; device?: 'wasm' | 'webgpu'; message?: string; id?: number; ids?: number[]; pcm?: Float32Array; sampleRate?: number };

/** A job in one of the engines: speech being streamed, or audio made ahead. */
interface Job {
    id: number;
    text: string;
    rank: number;
    kind: 'stream' | 'make';
    engine: KokoroWorker;
    /** Being moved to the GPU engine (dropped from the CPU queue, then sent again). */
    moving?: boolean;
    /** `synthesize` callers waiting for the whole audio. */
    waiters: Array<(a: VoiceAudio | undefined) => void>;
}

/** One Kokoro engine (a worker running one model on one device). */
class KokoroWorker {
    readonly worker: Worker;
    readonly ready: Promise<void>;
    /** Jobs sent here and not finished. */
    pending = 0;
    constructor(
        readonly device: 'wasm' | 'webgpu',
        voice: string,
        onProgress: (percent: number) => void,
        onMessage: (m: Out, from: KokoroWorker) => void
    ) {
        this.worker = new Worker(new URL('./kokoro.worker.ts', import.meta.url), { type: 'module' });
        this.ready = new Promise<void>((resolve, reject) => {
            this.worker.addEventListener('message', (ev: MessageEvent<Out>) => {
                const m = ev.data;
                if (m.type === 'progress') onProgress(m.percent ?? 0);
                else if (m.type === 'ready') resolve();
                else if (m.type === 'error' && m.id === undefined) reject(new Error(m.message ?? 'The voice engine failed to start'));
                else onMessage(m, this);
            });
            this.worker.addEventListener('error', (e) => reject(new Error(e.message || 'The voice engine failed to start')));
        });
        this.worker.postMessage({
            type: 'init',
            base: new URL(MODEL_BASE, location.href).href,
            ort: new URL(ORT_BASE, location.href).href,
            voice,
            dtype: device === 'webgpu' ? 'fp32' : 'q8',
            device,
        });
    }
    post(m: unknown): void {
        this.worker.postMessage(m);
    }
    terminate(): void {
        this.worker.terminate();
    }
}

export function webVoiceClient(): VoiceClient {
    const synth = typeof speechSynthesis !== 'undefined' ? speechSynthesis : undefined;
    let saved = load();
    /** Known at build time: this server has the voice model (no probing for a file that may 404). */
    const served = VOICE_SERVED;
    let kokoro: KokoroState = served ? { status: 'idle', downloadBytes: CPU_BYTES } : { status: 'unavailable', error: 'Not served here' };
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
                description: 'A neural voice that runs on this device (on its GPU when it can). Downloaded once from this app, then works offline. Phrases are kept, so anything said before plays at once.',
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

    // ── engines ────────────────────────────────────────────────────────────
    /** The engine new phrases go to (the GPU once it's ready). */
    let active: KokoroWorker | undefined;
    let ready: Promise<void> | undefined;
    let nextId = 1;
    const jobs = new Map<number, Job>();
    /** Background phrases held back while the CPU stands in for a GPU still warming (the CPU does what's needed now). */
    let deferred: Array<() => void> = [];
    let standIn = false;
    const kokoroVoice = () => (saved.engine === 'kokoro' && saved.voice ? saved.voice : DEFAULT_KOKORO);
    const usingKokoro = () => saved.engine === 'kokoro' && kokoro.status === 'ready' && !!active;

    const settle = (id: number, audio: VoiceAudio | undefined) => {
        const job = jobs.get(id);
        if (!job) return;
        jobs.delete(id);
        job.engine.pending--;
        job.waiters.forEach((r) => r(audio));
        retire(job.engine);
    };
    /** An engine the GPU has replaced goes once its last job is done. */
    const retire = (e: KokoroWorker) => {
        if (e !== active && e.pending <= 0) e.terminate();
    };
    /** Background work held back for the GPU goes now (to whichever engine is active). */
    const release = () => {
        standIn = false;
        const go = deferred;
        deferred = [];
        for (const f of go) f();
    };

    const prepare = (): Promise<void> => {
        if (ready) return ready;
        if (!served) return Promise.reject(new Error('The voice model is not served here'));
        kokoro = { ...kokoro, status: kokoro.cached ? 'loading' : 'downloading', progress: 0 };
        emit();
        const progress = (p: number) => {
            if (kokoro.status === 'ready') return;
            kokoro = { ...kokoro, progress: p, status: p >= 90 ? 'loading' : kokoro.status };
            emit();
        };
        const engine = (device: 'wasm' | 'webgpu', onProgress: (p: number) => void) => new KokoroWorker(device, kokoroVoice(), onProgress, onWorker);
        const serve = (e: KokoroWorker) => {
            active = e;
            kokoro = { status: 'ready', device: e.device, cached: true, downloadBytes: CPU_BYTES };
            emit();
        };
        const fail = (err: unknown) => {
            ready = undefined;
            kokoro = { ...kokoro, status: 'error', error: err instanceof Error ? err.message : String(err) };
            emit();
            throw err;
        };
        ready = (async () => {
            if (!(await gpuUsable())) {
                const cpu = engine('wasm', progress);
                await cpu.ready.catch((err: unknown) => (cpu.terminate(), fail(err)));
                return serve(cpu);
            }
            const gpu = engine('webgpu', progress);
            const gpuReady = Promise.race([gpu.ready, new Promise<never>((_, reject) => setTimeout(() => reject(new Error('The GPU took too long to start')), GPU_BUDGET_MS))]).then(
                () => gpu,
                (err: unknown) => {
                    gpu.terminate();
                    throw err;
                }
            );
            const first = await Promise.race([gpuReady.then((g) => ({ gpu: g })), new Promise<{ slow: true }>((r) => setTimeout(() => r({ slow: true }), GPU_HEDGE_MS))]).catch(() => ({ failed: true as const }));
            if ('gpu' in first) return serve(first.gpu);
            // The GPU is slow (or failed): the CPU stands in, and the GPU takes over when it's ready.
            const cpu = engine('wasm', () => undefined);
            await cpu.ready.catch((err: unknown) => (cpu.terminate(), fail(err)));
            standIn = !('failed' in first);
            serve(cpu);
            if (!standIn) return;
            gpuReady.then(
                (g) => {
                    const previous = active;
                    serve(g);
                    // Phrases still waiting on the CPU move over (it finishes only what it has started).
                    for (const j of jobs.values()) {
                        if (j.engine === previous && j.kind === 'make') {
                            j.moving = true;
                            previous.post({ type: 'drop', id: j.id });
                        }
                    }
                    release();
                    if (previous) retire(previous);
                },
                () => release()
            );
        })();
        return ready;
    };

    const send = (text: string, kind: 'stream' | 'make', rank: number): Job => {
        const job: Job = { id: nextId++, text, rank, kind, engine: active!, waiters: [] };
        jobs.set(job.id, job);
        dispatch(job);
        return job;
    };
    const dispatch = (job: Job) => {
        job.engine = active!;
        job.engine.pending++;
        job.engine.post({ type: 'job', id: job.id, kind: job.kind, rank: job.rank, text: job.text, voice: kokoroVoice(), speed: saved.rate });
    };
    /** A job already queued or running for this text (with the current voice and speed). */
    const findJob = (text: string) => [...jobs.values()].find((j) => j.text === text);

    // ── playback, for `speak` (the engine plays what it asks for itself) ────
    let ctx: AudioContext | undefined;
    const sources = new Set<AudioBufferSourceNode>();
    let at = 0;
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
        if (t?.job !== undefined) jobs.get(t.job)?.engine.post({ type: 'cancel', kind: 'stream' });
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

    function onWorker(m: Out): void {
        const mine = turn && m.id !== undefined && turn.job === m.id ? turn : undefined;
        if (m.type === 'chunk' && mine && m.pcm && m.sampleRate) {
            schedule(m.pcm, m.sampleRate);
        } else if (m.type === 'done' && m.id !== undefined) {
            const whole = m.pcm && m.sampleRate ? { pcm: m.pcm, sampleRate: m.sampleRate } : undefined;
            settle(m.id, whole);
            if (mine) {
                if (whole && !mine.scheduled) schedule(whole.pcm, whole.sampleRate);
                if (whole) mine.options?.onAudio?.(whole);
                mine.complete = true;
                if (!sources.size) end();
            }
        } else if (m.type === 'dropped') {
            for (const id of m.ids ?? []) {
                const job = jobs.get(id);
                if (job?.moving && active && job.engine !== active) {
                    // Off the CPU's queue, onto the GPU's.
                    job.moving = false;
                    job.engine.pending--;
                    retire(job.engine);
                    dispatch(job);
                } else settle(id, undefined);
            }
        } else if (m.type === 'error' && m.id !== undefined) {
            settle(m.id, undefined);
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
            const cache = await caches.open('transformers-cache');
            const cached = !!(await cache.match(CPU_MODEL)) || !!(await cache.match(GPU_MODEL));
            if (cached && kokoro.status === 'idle') {
                kokoro = { ...kokoro, cached: true };
                emit();
                if (saved.engine === 'kokoro') void prepare().catch(() => undefined);
            }
        } catch {
            // no Cache Storage (private mode): it downloads when asked
        }
    })();

    const dropPending = () => {
        for (const j of jobs.values()) j.engine.post({ type: 'cancel', kind: 'pending' });
    };

    const clientApi: VoiceClient = {
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
            if (`${kokoroVoice()}|${saved.rate}` !== before) dropPending();
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
            const queued = findJob(text);
            if (queued) {
                t.job = queued.id;
                queued.engine.post({ type: 'promote', id: queued.id });
                return;
            }
            t.job = send(text, 'stream', 0).id;
        },
        stop,
        capturesSpeech: true,
        // Not the model or device: audio made on the CPU still plays once the GPU has taken over.
        cacheKey: () => (usingKokoro() ? `kokoro:${REV}:${kokoroVoice()}:${saved.rate}` : undefined),
        synthesize: (text, priority, signal) => {
            if (!usingKokoro() || signal?.aborted) return Promise.resolve(undefined);
            const rank = RANK[priority];
            if (standIn && rank === RANK.later && !findJob(text)) {
                // Background work waits for the GPU: the CPU stays free for what's needed now.
                return new Promise<VoiceAudio | undefined>((resolve) => {
                    const go = () => (signal?.aborted ? resolve(undefined) : resolve(clientApi.synthesize!(text, priority, signal)));
                    deferred.push(go);
                    signal?.addEventListener('abort', () => ((deferred = deferred.filter((f) => f !== go)), resolve(undefined)), { once: true });
                });
            }
            const job = findJob(text) ?? send(text, 'make', rank);
            if (rank < job.rank) {
                job.rank = rank;
                job.engine.post({ type: 'bump', id: job.id, rank });
            }
            return new Promise<VoiceAudio | undefined>((resolve) => {
                job.waiters.push(resolve);
                // Given up on before it started: out of the queue (the speech engine only aborts when nobody wants it).
                signal?.addEventListener(
                    'abort',
                    () => {
                        const i = job.waiters.indexOf(resolve);
                        if (i >= 0) job.waiters.splice(i, 1);
                        resolve(undefined);
                        if (!job.waiters.length && jobs.has(job.id) && job.id !== turn?.job) job.engine.post({ type: 'drop', id: job.id });
                    },
                    { once: true }
                );
            });
        },
        cancelPending: dropPending,
        reprioritize: (text, priority) => {
            const job = findJob(text);
            if (!job || job.kind !== 'make') return;
            job.rank = RANK[priority];
            job.engine.post({ type: 'bump', id: job.id, rank: job.rank });
        },
    };
    return clientApi;
}
