#!/usr/bin/env node
/**
 * Web app smoke test in Chromium, Firefox and WebKit, against the production
 * build served with the security headers deployed in docker/nginx
 * (parsed from app-headers.conf, so the CSP under test is the real one):
 *
 *   landing → the sample (golden numbers) → Map: drill, select, Inspector →
 *   "Open file" → CodeMirror shows the file → a .zip through the file input
 *   — with no CSP violations or page errors.
 *
 *   pnpm --filter @codearchy/app build && pnpm --filter @codearchy/app test:e2e [-- chromium,firefox,webkit]
 *   APP_URL=http://app.localhost:8088/ node test/smoke.mjs chromium,firefox   (against the Docker image)
 */
import * as assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as http from 'node:http';
import * as os from 'node:os';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, firefox, webkit } from 'playwright';
import { zipSync } from 'fflate';
import { GOLDEN_POLYGLOT } from '@codearchy/conformance';

const APP = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(APP, 'dist');
const NGINX = path.resolve(APP, '..', '..', 'docker', 'nginx', 'app-headers.conf');

/** `add_header Name "value" always;` lines → headers. */
const headers = Object.fromEntries(
    [...fs.readFileSync(NGINX, 'utf8').matchAll(/^add_header\s+([\w-]+)\s+"([^"]*)"/gm)].map((m) => [m[1], m[2]])
);
assert.ok(headers['Content-Security-Policy'], 'CSP found in app-headers.conf');

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.wasm': 'application/wasm', '.json': 'application/json', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json' };
const server = http.createServer((req, res) => {
    const url = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    let file = path.resolve(DIST, `.${url}`);
    if (!file.startsWith(DIST) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(DIST, 'index.html'); // SPA fallback, like nginx
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] ?? 'application/octet-stream', 'Cache-Control': 'no-store', ...headers });
    fs.createReadStream(file).pipe(res);
});
// APP_URL: test a running deployment instead (e.g. the Docker image: http://app.localhost:8088/).
const external = process.env.APP_URL;
if (!external) await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = external ?? `http://127.0.0.1:${server.address().port}/`;

// The sample again, as a GitHub-style zip.
const samplePath = fs.readdirSync(path.join(DIST, 'engine')).map((v) => path.join(DIST, 'engine', v, 'samples', 'polyglot.json')).find(fs.existsSync);
const sample = JSON.parse(fs.readFileSync(samplePath, 'utf8'));
const zipFile = path.join(os.tmpdir(), 'codearchy-sample.zip');
fs.writeFileSync(zipFile, zipSync(Object.fromEntries(Object.entries(sample).map(([p, t]) => [`polyglot-main/${p}`, new TextEncoder().encode(t)]))));

const engines = { chromium, firefox, webkit };
const wanted = (process.argv[2] ?? 'chromium,firefox,webkit').split(',');
let failed = 0;

for (const name of wanted) {
    const profile = fs.mkdtempSync(path.join(os.tmpdir(), `codearchy-app-${name}-`));
    // WebKit's default context is like Private Browsing (no OPFS sync access).
    const browser = name === 'webkit' ? undefined : await engines[name].launch();
    const context = browser ? await browser.newContext({ serviceWorkers: 'block' }) : await engines[name].launchPersistentContext(profile, { serviceWorkers: 'block' });
    const page = await context.newPage();
    page.setDefaultTimeout(120_000);
    const problems = [];
    page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
    page.on('console', (m) => {
        const t = m.text();
        if (m.type() === 'error' || /Content.Security.Policy|Refused to/i.test(t)) problems.push(`console: ${t}`);
    });
    const node = (key) => page.locator(`.react-flow__node[data-id="${key}"]`);
    const started = Date.now();
    try {
        await page.goto(base);
        await page.getByRole('button', { name: 'Try the sample' }).click();
        await node('pkg:rust').waitFor();
        const status = await page.locator('.status').textContent();
        assert.match(status, new RegExp(`${GOLDEN_POLYGLOT.files.length} files`), 'golden file count');

        await node('pkg:.').dblclick();
        await node('dir:web/src').dblclick();
        await node('mod:web/src/index.ts').click();
        await page.locator('.ca-inspector', { hasText: 'Depends on' }).waitFor();
        await page.getByRole('button', { name: 'Open file' }).click();
        await page.locator('.viewer .cm-content', { hasText: 'export const app' }).waitFor();
        await page.getByRole('button', { name: 'Close the code viewer' }).click();

        await page.getByRole('button', { name: 'Open another…' }).click();
        await page.locator('input[type=file][accept*=zip]').setInputFiles(zipFile);
        await node('pkg:rust').waitFor();
        assert.match(await page.locator('.status').textContent(), new RegExp(`${GOLDEN_POLYGLOT.files.length} files`), 'zip: golden file count');

        assert.deepEqual(problems, [], 'no CSP violations or page errors');
        console.log(`✓ ${name.padEnd(8)} sample, Map, Inspector, code viewer, zip; strict CSP (${Date.now() - started} ms)`);
    } catch (err) {
        failed++;
        console.log(`✗ ${name}: ${err.message}${problems.length ? `\n    ${problems.slice(0, 5).join('\n    ')}` : ''}`);
    } finally {
        await context.close();
        await browser?.close();
        fs.rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
    }
}
if (!external) server.close();
if (failed) process.exit(1);
console.log('\nweb app smoke passes');
process.exit(0);
