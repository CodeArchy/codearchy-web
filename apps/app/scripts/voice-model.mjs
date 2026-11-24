#!/usr/bin/env node
/**
 * Prepares the narration voice for the app to serve itself (public/voice/,
 * git-ignored), so the browser never talks to a third party for it:
 *
 *   voice/<rev8>/…   Kokoro-82M at the commit pinned in src/voice/model.json,
 *                    each file checked against its sha256 (~107 MB)
 *   voice/ort/…      ONNX Runtime's WebAssembly, from the installed
 *                    @huggingface/transformers (it must match that version)
 *
 * The Docker build runs it; in development it's optional (`pnpm voice`):
 * without it the app offers the system voice only.
 *
 * Usage: node scripts/voice-model.mjs [--offline]   (--offline: verify what's there, download nothing)
 */
import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import { createRequire } from 'node:module';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const APP = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifest = JSON.parse(fs.readFileSync(path.join(APP, 'src', 'voice', 'model.json'), 'utf8'));
const offline = process.argv.includes('--offline');
const out = path.join(APP, 'public', 'voice', manifest.revision.slice(0, 8));

const sha256 = (file) => createHash('sha256').update(fs.readFileSync(file)).digest('hex');

/** One file, retried: CDN reads time out now and then (and a Docker build shouldn't fail for it). */
async function download(url, rel, attempts = 4) {
    for (let i = 1; ; i++) {
        try {
            const res = await fetch(url, { redirect: 'follow' });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return Buffer.from(await res.arrayBuffer());
        } catch (err) {
            if (i >= attempts) throw new Error(`${rel}: ${err instanceof Error ? err.message : String(err)} (after ${attempts} attempts)`);
            console.log(`[voice] ${rel}: ${err instanceof Error ? (err.cause?.code ?? err.message) : err}, retrying (${i}/${attempts - 1})`);
            await new Promise((r) => setTimeout(r, 2000 * i));
        }
    }
}

async function fetchVerified(rel, want) {
    const dest = path.join(out, rel);
    if (fs.existsSync(dest) && fs.statSync(dest).size === want.size && sha256(dest) === want.sha256) return 'kept';
    if (offline) throw new Error(`${rel} is missing or changed (run without --offline to download it)`);
    const url = `https://huggingface.co/${manifest.repository}/resolve/${manifest.revision}/${rel}`;
    const bytes = await download(url, rel);
    const got = createHash('sha256').update(bytes).digest('hex');
    if (bytes.length !== want.size || got !== want.sha256) throw new Error(`${rel}: size or sha256 mismatch (got ${bytes.length} bytes, ${got})`);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(`${dest}.part`, bytes);
    fs.renameSync(`${dest}.part`, dest);
    return 'downloaded';
}

// Old revisions go: only the pinned one is served.
const root = path.join(APP, 'public', 'voice');
if (fs.existsSync(root)) for (const d of fs.readdirSync(root)) if (d !== path.basename(out) && d !== 'ort') fs.rmSync(path.join(root, d), { recursive: true, force: true });

let downloaded = 0;
const entries = Object.entries(manifest.files);
// A few at a time: the model is one big file, the voices many small ones.
for (let i = 0; i < entries.length; i += 6) {
    const batch = await Promise.all(entries.slice(i, i + 6).map(([rel, want]) => fetchVerified(rel, want)));
    downloaded += batch.filter((r) => r === 'downloaded').length;
}

// ONNX Runtime's wasm, matching the transformers.js the worker bundles.
/** A package's folder (from its entry: not every package exports its package.json). */
const packageRoot = (from, name) => {
    let dir = path.dirname(createRequire(from).resolve(name));
    while (!fs.existsSync(path.join(dir, 'package.json')) || JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8')).name !== name) {
        const up = path.dirname(dir);
        if (up === dir) throw new Error(`can't find the ${name} package`);
        dir = up;
    }
    return dir;
};
const kokoro = packageRoot(path.join(APP, 'package.json'), 'kokoro-js');
const transformers = packageRoot(path.join(kokoro, 'package.json'), '@huggingface/transformers');
fs.mkdirSync(path.join(root, 'ort'), { recursive: true });
for (const f of ['ort-wasm-simd-threaded.jsep.mjs', 'ort-wasm-simd-threaded.jsep.wasm']) fs.copyFileSync(path.join(transformers, 'dist', f), path.join(root, 'ort', f));

const bytes = entries.reduce((n, [, f]) => n + f.size, 0);
console.log(`[voice] Kokoro ${manifest.revision.slice(0, 8)}: ${entries.length} files (${(bytes / 1e6).toFixed(0)} MB) verified, ${downloaded} downloaded; ONNX Runtime wasm copied`);
