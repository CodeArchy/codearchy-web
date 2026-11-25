/**
 * Kokoro-82M in a worker, as a queue of jobs made a sentence at a time.
 *
 * Two kinds of job: `stream` (being spoken: each sentence is posted as it's
 * made) and `make` (narration made ahead, posted whole when done). Streams
 * always go first, then `make` jobs by priority, and the queue is looked at
 * again after every sentence, so a step you're waiting for never sits behind
 * a long background job. A queued `make` job can be promoted to a stream (you
 * pressed Next before it finished): what it already made plays at once.
 *
 * The model is served by the app itself (public/voice/, see
 * scripts/voice-model.mjs): a fetch shim maps the Hugging Face URLs kokoro-js
 * and transformers.js build to that folder, so nothing leaves the app's
 * origin. With WebGPU, the fp32 model runs on the GPU (about 1.5x faster than
 * speech); otherwise the q8 model runs on the CPU, on several threads when the
 * page is cross-origin isolated.
 *
 *   init     → { type:'init', base, ort, voice }       ready ← { type:'ready', device, threads }
 *   job      → { type:'job', id, kind, rank, text, voice, speed }
 *                                                     chunk ← { type:'chunk', id, pcm, sampleRate }   (streams)
 *                                                     done  ← { type:'done', id, pcm, sampleRate }    (all jobs: the whole audio)
 *   promote  → { type:'promote', id }                 (make → stream: its chunks so far are posted)
 *   bump     → { type:'bump', id, rank }                (a queued job's priority, up or down)
 *   drop     → { type:'drop', id }                    (not started yet: removed; dropped ← { type:'dropped', ids })
 *   cancel   → { type:'cancel', kind:'stream' | 'pending' }   (stream: kept going in the background; pending: dropped ← { type:'dropped', ids })
 *                                                     error ← { type:'error', id?, message }
 */
import { KokoroTTS, env } from 'kokoro-js';

const HF = 'https://huggingface.co/onnx-community/Kokoro-82M-v1.0-ONNX/resolve/main/';

type Kind = 'stream' | 'make';
interface Job {
    id: number;
    kind: Kind;
    rank: number;
    seq: number;
    pieces: string[];
    at: number;
    voice: string;
    speed: number;
    chunks: Float32Array[];
    sampleRate: number;
    /** Streams: when the first sentence went out, and how much audio has gone out since. */
    startedAt?: number;
    seconds: number;
}

/** Seconds of speech a stream has made beyond what has played (playback is continuous once it starts). */
function ahead(job: Job): number {
    return job.startedAt === undefined ? 0 : job.seconds - (performance.now() - job.startedAt) / 1000;
}
type In =
    | { type: 'init'; base: string; ort: string; voice: string; dtype: 'q8' | 'fp32'; device: 'wasm' | 'webgpu' }
    | { type: 'job'; id: number; kind: Kind; rank: number; text: string; voice: string; speed: number }
    | { type: 'promote'; id: number }
    | { type: 'bump'; id: number; rank: number }
    | { type: 'cancel'; kind: 'stream' | 'pending' }
    | { type: 'drop'; id: number };

const post = (data: unknown, transfer: Transferable[] = []) => (self as unknown as Worker).postMessage(data, transfer);

let tts: KokoroTTS | undefined;
const jobs: Job[] = [];
let seq = 0;
let running = false;

function installFetchShim(base: string): void {
    const original = self.fetch.bind(self);
    const shim: typeof fetch = (input, init) => {
        const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
        if (url.startsWith(HF)) return original(base + url.slice(HF.length), init);
        // Nothing else goes to Hugging Face (or anywhere): the app serves the model.
        if (/^https?:\/\//.test(url) && !url.startsWith(self.location.origin)) return Promise.resolve(new Response(null, { status: 404, statusText: 'CodeArchy serves the voice model itself' }));
        return original(input, init);
    };
    Object.defineProperty(self, 'fetch', { value: shim, writable: true, configurable: true });
}

/**
 * Sentences, with long ones cut at a comma or a space (Kokoro reads a few
 * hundred characters at a time), and a short first piece when it's spoken so
 * the first sound comes quickly. One pass, no backtracking.
 */
/** Background jobs (made ahead) run in small pieces: an inference can't be interrupted, so this bounds how long a phrase someone is waiting for waits. */
const BACKGROUND_PIECE = 48;

function pieces(text: string, quickStart: boolean, max = 200): string[] {
    const sentences: string[] = [];
    let start = 0;
    for (let i = 0; i < text.length; i++) {
        const c = text[i];
        if ((c === '.' || c === '!' || c === '?' || c === ';') && (i + 1 === text.length || text[i + 1] === ' ' || text[i + 1] === '\n')) {
            const s = text.slice(start, i + 1).trim();
            if (s) sentences.push(s);
            start = i + 1;
        }
    }
    const rest = text.slice(start).trim();
    if (rest) sentences.push(rest);
    const out: string[] = [];
    const cut = (s: string, max: number, min: number) => {
        while (s.length > max) {
            let at = s.lastIndexOf(', ', max);
            if (at < min) at = s.lastIndexOf(' ', max);
            if (at < min) at = max;
            out.push(s.slice(0, at + 1).trim());
            s = s.slice(at + 1).trim();
        }
        if (s) out.push(s);
    };
    sentences.forEach((s, i) => (quickStart && i === 0 ? cut(s, 70, 20) : cut(s, max, Math.min(60, Math.round(max / 2)))));
    return out;
}

async function init(base: string, ort: string, voice: string, dtype: 'q8' | 'fp32', device: 'wasm' | 'webgpu'): Promise<void> {
    installFetchShim(base);
    const e = env as unknown as { wasmPaths: unknown };
    e.wasmPaths = { mjs: `${ort}ort-wasm-simd-threaded.jsep.mjs`, wasm: `${ort}ort-wasm-simd-threaded.jsep.wasm` };
    const files = new Map<string, { loaded: number; total: number }>();
    let last = -1;
    const progress = (info: { status: string; file?: string; loaded?: number; total?: number }) => {
        if (!info.file) return;
        if (info.status === 'progress') files.set(info.file, { loaded: info.loaded ?? 0, total: info.total ?? 0 });
        else if (info.status === 'initiate' && !files.has(info.file)) files.set(info.file, { loaded: 0, total: 0 });
        else if (info.status === 'done') {
            const f = files.get(info.file);
            files.set(info.file, { loaded: f?.total || 1, total: f?.total || 1 });
        }
        let loaded = 0;
        let total = 0;
        for (const f of files.values()) (loaded += f.loaded), (total += f.total);
        const percent = total ? Math.round((loaded / total) * 90) : 0;
        if (percent !== last) post({ type: 'progress', percent: (last = percent) });
    };
    tts = await KokoroTTS.from_pretrained('onnx-community/Kokoro-82M-v1.0-ONNX', { dtype, device, progress_callback: progress as never });
    // The first run compiles the graph: do it now, not on the first thing spoken.
    post({ type: 'progress', percent: 95 });
    await tts.generate('Ready.', { voice } as never);
    post({ type: 'ready', device, threads: self.crossOriginIsolated ? Math.min(4, Math.max(1, Math.floor((navigator.hardwareConcurrency || 2) / 2))) : 1 });
}

function next(): Job | undefined {
    let best: Job | undefined;
    for (const j of jobs) {
        if (!best) best = j;
        else if (j.kind !== best.kind ? j.kind === 'stream' : j.rank !== best.rank ? j.rank < best.rank : j.seq < best.seq) best = j;
    }
    // While the step being spoken is comfortably ahead of playback, give the next step a
    // sentence (its first one as soon as there's a little slack), so Next finds it started.
    if (best?.kind === 'stream') {
        const slack = ahead(best);
        const soon = jobs.filter((j) => j.kind === 'make' && j.rank <= 1).sort((a, b) => a.rank - b.rank || a.seq - b.seq)[0];
        if (soon && (slack > 6 || (slack > 2.5 && soon.at === 0))) return soon;
    }
    return best;
}

function finish(job: Job): void {
    jobs.splice(jobs.indexOf(job), 1);
    const total = job.chunks.reduce((n, c) => n + c.length, 0);
    const pcm = new Float32Array(total);
    let o = 0;
    for (const c of job.chunks) pcm.set(c, o), (o += c.length);
    post({ type: 'done', id: job.id, pcm, sampleRate: job.sampleRate }, [pcm.buffer]);
}

async function pump(): Promise<void> {
    if (running || !tts) return;
    running = true;
    try {
        for (let job = next(); job; job = next()) {
            if (job.at >= job.pieces.length) {
                finish(job);
                continue;
            }
            const piece = job.pieces[job.at]!;
            let audio: { audio: Float32Array; sampling_rate: number };
            try {
                audio = (await tts.generate(piece, { voice: job.voice, speed: job.speed } as never)) as unknown as { audio: Float32Array; sampling_rate: number };
            } catch (err) {
                jobs.splice(jobs.indexOf(job), 1);
                post({ type: 'error', id: job.id, message: err instanceof Error ? err.message : String(err) });
                continue;
            }
            // Inference blocks this thread: let queued messages in (a promote, a cancel, a new
            // stream) before choosing the next sentence, or they'd wait for the whole queue.
            await new Promise((r) => setTimeout(r, 0));
            if (!jobs.includes(job)) continue; // cancelled while this sentence was being made
            const pcm = new Float32Array(audio.audio);
            job.sampleRate = audio.sampling_rate;
            job.chunks.push(pcm);
            job.at++;
            job.seconds += pcm.length / audio.sampling_rate;
            if (job.kind === 'stream') {
                job.startedAt ??= performance.now() - (job.seconds - pcm.length / audio.sampling_rate) * 1000;
                post({ type: 'chunk', id: job.id, pcm: pcm.slice(), sampleRate: audio.sampling_rate });
            }
            if (job.at >= job.pieces.length) finish(job);
        }
    } finally {
        running = false;
    }
}

self.onmessage = (ev: MessageEvent<In>) => {
    const msg = ev.data;
    switch (msg.type) {
        case 'init':
            init(msg.base, msg.ort, msg.voice, msg.dtype, msg.device).then(
                () => void pump(),
                (err: unknown) => post({ type: 'error', message: err instanceof Error ? err.message : String(err) })
            );
            break;
        case 'job':
            // A phrase from the speech engine is already sized (start short, grow); streams start short too.
            jobs.push({ id: msg.id, kind: msg.kind, rank: msg.rank, seq: seq++, pieces: pieces(msg.text, msg.kind === 'stream', msg.rank > 0 ? BACKGROUND_PIECE : 200), at: 0, voice: msg.voice, speed: msg.speed, chunks: [], sampleRate: 24000, seconds: 0 });
            void pump();
            break;
        case 'promote': {
            const job = jobs.find((j) => j.id === msg.id);
            if (!job) break;
            job.kind = 'stream';
            job.rank = 0;
            // What it made already plays now; playback starts here.
            job.startedAt = job.chunks.length ? performance.now() : undefined;
            for (const c of job.chunks) post({ type: 'chunk', id: job.id, pcm: c.slice(), sampleRate: job.sampleRate });
            break;
        }
        case 'drop': {
            const job = jobs.find((j) => j.id === msg.id);
            if (job && job.at === 0 && job.kind === 'make') {
                jobs.splice(jobs.indexOf(job), 1);
                post({ type: 'dropped', ids: [job.id] });
            }
            break;
        }
        case 'bump': {
            // Up or down: a phrase whose urgent asker gave up goes back behind what's needed now.
            const job = jobs.find((j) => j.id === msg.id);
            if (job && job.kind === 'make') job.rank = msg.rank;
            break;
        }
        case 'cancel': {
            // A stream nobody listens to any more (you moved on) finishes in the background, so the
            // step is kept for next time; queued jobs that haven't started are dropped.
            if (msg.kind === 'stream') {
                for (const j of jobs) if (j.kind === 'stream') (j.kind = 'make'), (j.rank = 2), (j.startedAt = undefined);
                break;
            }
            const drop = jobs.filter((j) => j.kind === 'make' && j.at === 0 && j.rank > 0);
            for (const j of drop) jobs.splice(jobs.indexOf(j), 1);
            if (drop.length) post({ type: 'dropped', ids: drop.map((j) => j.id) });
            break;
        }
    }
};
