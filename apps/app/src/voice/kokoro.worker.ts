/**
 * Kokoro-82M in a worker: speech off the UI thread, one audio chunk per
 * sentence so playback starts while the rest is still being made.
 *
 * The model is served by the app itself (public/voice/, see
 * scripts/voice-model.mjs): kokoro-js and transformers.js build Hugging Face
 * URLs, and a fetch shim maps them to that folder, so nothing leaves the
 * app's origin. transformers.js keeps the files in the browser cache after
 * the first load, so the voice works offline from then on.
 *
 *   init  → { type:'init', base, ort }        progress ← { type:'progress', percent }
 *                                             ready    ← { type:'ready', device }
 *   speak → { type:'speak', id, text, voice, speed }
 *                                             chunk    ← { type:'chunk', id, pcm, sampleRate }
 *                                             end      ← { type:'end', id }
 *   stop  → { type:'stop' }                   error    ← { type:'error', id?, message }
 */
import { KokoroTTS, TextSplitterStream, env } from 'kokoro-js';

const HF = 'https://huggingface.co/onnx-community/Kokoro-82M-v1.0-ONNX/resolve/main/';

type In = { type: 'init'; base: string; ort: string } | { type: 'speak'; id: number; text: string; voice: string; speed: number } | { type: 'stop' };

const post = (data: unknown, transfer: Transferable[] = []) => (self as unknown as Worker).postMessage(data, transfer);

let tts: KokoroTTS | undefined;
let generation = 0;

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

async function init(base: string, ort: string): Promise<void> {
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
        const percent = total ? Math.round((loaded / total) * 95) : 0;
        if (percent !== last) post({ type: 'progress', percent: (last = percent) });
    };
    tts = await KokoroTTS.from_pretrained('onnx-community/Kokoro-82M-v1.0-ONNX', {
        dtype: 'q8',
        device: 'wasm',
        progress_callback: progress as never,
    });
    post({ type: 'ready', device: 'wasm' });
}

async function speak(id: number, text: string, voice: string, speed: number): Promise<void> {
    if (!tts) throw new Error('The voice is not loaded');
    const mine = ++generation;
    const splitter = new TextSplitterStream();
    splitter.push(text);
    splitter.close();
    type Opts = NonNullable<Parameters<KokoroTTS['stream']>[1]>;
    for await (const { audio } of tts.stream(splitter, { voice, speed } as unknown as Opts)) {
        if (mine !== generation) return;
        const pcm = new Float32Array(audio.audio as Float32Array);
        post({ type: 'chunk', id, pcm, sampleRate: audio.sampling_rate }, [pcm.buffer]);
    }
    if (mine === generation) post({ type: 'end', id });
}

self.onmessage = (ev: MessageEvent<In>) => {
    const msg = ev.data;
    if (msg.type === 'init') {
        init(msg.base, msg.ort).catch((err: unknown) => post({ type: 'error', message: err instanceof Error ? err.message : String(err) }));
    } else if (msg.type === 'speak') {
        speak(msg.id, msg.text, msg.voice, msg.speed).catch((err: unknown) => post({ type: 'error', id: msg.id, message: err instanceof Error ? err.message : String(err) }));
    } else if (msg.type === 'stop') {
        generation++;
    }
};
