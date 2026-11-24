#!/usr/bin/env node
/**
 * Web app smoke test in Chromium, Firefox and WebKit, against the production
 * build served with the security headers deployed in docker/nginx
 * (parsed from app-headers.conf, so the CSP under test is the real one):
 *
 *   landing → the sample (golden numbers) → Map: drill, select, Inspector →
 *   "Open file" → CodeMirror shows the file → Flows → Tours → the Companion
 *   (a real `codearchy serve`: pair from its link, browse, reload resumes,
 *   stopping it shows "disconnected") → a .zip through the file input
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
import { spawn } from 'node:child_process';
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

/** A real Companion (`codearchy serve`) on the polyglot fixture; resolves with its pairing link. */
const CLI = path.resolve(APP, '..', '..', '.codearchy', 'apps', 'cli', 'dist', 'main.js');
const FIXTURE = path.resolve(APP, '..', '..', '.codearchy', 'fixtures', 'polyglot');
function startCompanion() {
    // A throwaway HOME: the Companion keeps its authorship ledger there, not in the real home folder.
    const home = fs.mkdtempSync(path.join(os.tmpdir(), 'codearchy-companion-home-'));
    const proc = spawn(process.execPath, [CLI, 'serve', '--root', FIXTURE, '--app', new URL(base).origin], { stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, HOME: home, USERPROFILE: home } });
    let out = '';
    const link = new Promise((resolve, reject) => {
        proc.stdout.on('data', (d) => {
            out += d;
            const m = /(https?:\/\/\S+#pair=\S+)/.exec(out);
            if (m) resolve(m[1]);
        });
        proc.on('exit', (code) => reject(new Error(`codearchy serve exited (${code})`)));
    });
    return { link, stop: () => proc.kill('SIGTERM') };
}

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
    // The AI host checks its providers as soon as a card is shown: Ollama and LM Studio aren't running here
    // (connection refused; WebKit reports that as an access-control failure) and the test key is rejected (401).
    // Only those messages are tolerated. CSP violations and page errors never are.
    const expectedProbe = (t) =>
        // (WebKit says "Could not connect to the server." on macOS, "Could not connect to localhost: Connection refused" on Linux.)
        /Could not connect to (the server|localhost|127\.0\.0\.1)|Connection refused|ERR_CONNECTION_REFUSED|NetworkError when attempting to fetch|status of 401/i.test(t) ||
        /Fetch API cannot load http:\/\/(localhost|127\.0\.0\.1):(11434|1234)\/.* due to access control checks/.test(t);
    // Provider checks, counted (routes see the worker's requests where the browser allows; the console where it logs them).
    let probes = 0;
    page.on('console', (m) => {
        const t = m.text();
        if (/Content.Security.Policy|Refused to/i.test(t)) problems.push(`console: ${t}`);
        else if (m.type() === 'error' && !expectedProbe(t)) problems.push(`console: ${t}`);
        else if (expectedProbe(t)) probes++;
    });
    for (const local of ['http://localhost:11434/**', 'http://localhost:1234/**']) {
        await context.route(local, (route) => {
            probes++;
            return route.continue();
        });
    }
    // A provider check with the test key gets the answer Anthropic gives a bad key, without the network where the
    // browser lets tests route a worker's requests (the real API returns the same 401 otherwise).
    await context.route('https://api.anthropic.com/**', (route) => (probes++,
        route.fulfill({ status: 401, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ type: 'error', error: { type: 'authentication_error', message: 'invalid x-api-key' } }) })),
    );
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

        // Flows: the sample's Go main, its trace, a step in the Inspector, the declaration in the viewer, back to the Map.
        await page.click('.ca-segmented button:has-text("Flows")');
        await page.locator('.ca-flow-item', { hasText: 'main' }).first().click();
        await page.locator('.ca-flow-head h2', { hasText: 'main' }).waitFor();
        await page.locator('.ca-step-main', { hasText: 'main' }).first().click();
        await page.locator('.ca-inspector[data-key="mod:go/cmd/server/main.go"]').waitFor();
        await page.getByRole('button', { name: 'Open declaration' }).click();
        await page.locator('.viewer .cm-content', { hasText: 'func main' }).waitFor();
        await page.getByRole('button', { name: 'Close the code viewer' }).click();
        await page.getByRole('button', { name: 'Show on map' }).click();
        await node('mod:go/cmd/server/main.go').waitFor();

        // Tours: Start Here plays over the canvas; a draft from "Add to tour" downloads as an anchored tour file.
        await page.click('.ca-segmented button:has-text("Tours")');
        await page.locator('.ca-tour-card', { hasText: 'Start here' }).getByRole('button', { name: /Start|Resume|Replay/ }).click();
        const player = page.locator('.ca-tour-player');
        await player.locator('h3', { hasText: 'The big picture' }).waitFor();
        await player.getByRole('button', { name: 'Next' }).click();
        await player.locator('h3', { hasText: 'Where things start' }).waitFor();
        await player.getByRole('button', { name: 'Close the tour' }).click();
        await page.click('.ca-segmented button:has-text("Map")');
        await node('pkg:rust').click(); // the tour's first step brought the canvas back to the top level
        await page.locator('.ca-inspector[data-key="pkg:rust"]').getByRole('button', { name: 'Add to tour' }).click();
        const add = page.getByRole('dialog', { name: 'Add to tour' });
        await add.getByLabel('Tour title').fill('Rust core');
        await add.getByLabel(/What should a newcomer notice/).fill('The Rust package holds the engine.');
        await add.getByRole('button', { name: 'Add step' }).click();
        await page.click('.ca-segmented button:has-text("Tours")');
        const draft = page.locator('.ca-tour-card', { hasText: 'Rust core' });
        const [download] = await Promise.all([page.waitForEvent('download'), draft.getByRole('button', { name: 'Download .json' }).click()]);
        assert.equal(download.suggestedFilename(), 'rust-core.json');
        const tourFile = JSON.parse(fs.readFileSync(await download.path(), 'utf8'));
        assert.equal(tourFile.version, 1);
        assert.equal(tourFile.steps[0].target.node, 'pkg:rust');
        assert.ok(tourFile.steps[0].anchorHash, 'the engine worker anchors the step');
        await draft.getByRole('button', { name: 'Discard' }).click();
        await page.click('.ca-segmented button:has-text("Map")');

        // The Companion: a real `codearchy serve`. Its link opens the app connected; a reload resumes the
        // session; stopping it says so. (The page still goes through the CSP's connect-src.)
        const companion = startCompanion();
        try {
            await page.goto(await companion.link);
            await page.locator('.companion-badge').waitFor();
            await node('pkg:rust').waitFor();
            assert.doesNotMatch(page.url(), /pair=/, 'the token leaves the address bar');
            await page.click('.ca-segmented button:has-text("Flows")');
            await page.locator('.ca-flow-item', { hasText: 'main' }).first().waitFor();

            // Authorship through the Companion: the lens, then the code viewer's gutter, review and correction.
            await page.click('.ca-segmented button:has-text("Map")');
            await page.locator('.ca-lens select option[value="authorship"]').waitFor({ state: 'attached' });
            await page.selectOption('.ca-lens select', 'authorship');
            await node('pkg:rust').locator('.ca-lens-badge').waitFor();
            await page.locator('.ca-root').focus();
            await page.keyboard.press('Control+k');
            await page.locator('.ca-search input').fill('billing');
            await page.locator('.ca-search li', { hasText: 'billing.rb' }).first().click();
            await page.locator('.ca-inspector[data-key="mod:rb/lib/billing.rb"]').getByRole('button', { name: 'Open file' }).click();
            const viewer = page.locator('.viewer');
            await viewer.locator('.viewer-authorship').waitFor();
            const lines = viewer.locator('.cm-line');
            await lines.nth(0).click();
            await lines.nth(1).click({ modifiers: ['Shift'] });
            await viewer.locator('.viewer-authorship .sel', { hasText: 'Lines 1–2' }).waitFor();
            await viewer.getByLabel('Correct authorship of the selected lines').selectOption('ai');
            await viewer.locator('.cm-authorship-ai').first().waitFor();
            await viewer.getByRole('button', { name: 'Mark as reviewed' }).click();
            await viewer.locator('.cm-authorship-reviewed').first().waitFor();
            await viewer.getByRole('status').filter({ hasText: 'Marked 2 lines as reviewed' }).waitFor();
            await viewer.getByLabel('Correct authorship of the selected lines').selectOption('unknown');
            await viewer.locator('.cm-authorship-reviewed').first().waitFor({ state: 'detached' });
            await page.getByRole('button', { name: 'Close the code viewer' }).click();
            await page.selectOption('.ca-lens select', 'dependencies');

            // The branch report through the Companion (the fixture is at HEAD: nothing added).
            await page.getByRole('button', { name: 'Branch report' }).click();
            const report = page.getByRole('dialog', { name: 'Branch authorship report' });
            await report.getByLabel('Compare with').fill('HEAD');
            await report.getByRole('button', { name: 'Generate' }).click();
            await report.getByLabel('Report (Markdown)').filter({ hasText: 'Authorship: this branch vs `HEAD`' }).waitFor();
            await report.getByLabel('Compare with').fill('--output=/tmp/x');
            await report.getByRole('button', { name: 'Generate' }).click();
            await report.getByRole('alert').filter({ hasText: 'branch, tag or commit' }).waitFor();
            await report.getByRole('button', { name: 'Close the report' }).click();

            await page.reload();
            await page.locator('.companion-badge').waitFor(); // resumed with the tab's session
            await node('pkg:rust').waitFor();
        } finally {
            companion.stop();
        }
        await page.locator('.disconnected', { hasText: 'Companion disconnected' }).waitFor();

        await page.getByRole('button', { name: 'Open another…' }).click();
        await page.locator('input[type=file][accept*=zip]').setInputFiles(zipFile);
        await node('pkg:rust').waitFor();
        assert.match(await page.locator('.status').textContent(), new RegExp(`${GOLDEN_POLYGLOT.files.length} files`), 'zip: golden file count');

        // AI: settings (private by default, Ollama setup for this origin, keys), an auto-summary card, and chat
        // that offers setup when no model is ready. Then a reload keeps the key (encrypted) and the tier.
        const KEY = 'sk-ant-smoke-not-a-real-key-0123456789';
        // Selecting nodes showed auto-built cards: no provider may have been contacted yet.
        assert.equal(probes, 0, 'no AI provider is contacted before AI is used');
        await page.getByRole('button', { name: 'AI', exact: true }).click();
        const settings = page.getByRole('dialog', { name: 'AI settings' });
        const tab = (name) => settings.getByRole('tab', { name }).click();
        await settings.getByLabel(/Local only/).waitFor();
        assert.equal(await settings.getByLabel(/Local only/).isChecked(), true, 'local only by default');
        await settings.getByText('No model is ready for chat yet.').waitFor(); // the banner says what's missing
        await tab('Providers');
        const ollama = settings.locator('[data-provider="ollama"]');
        await ollama.getByText('not reachable').waitFor();
        await ollama.locator('summary').click();
        const origin = new URL(base).origin;
        const setupText = await ollama.locator('.ca-setup').textContent();
        assert.ok(setupText.includes('OLLAMA_ORIGINS') && setupText.includes(`"${origin}"`), `setup steps name this origin: ${setupText}`);
        const anthropic = settings.locator('[data-provider="anthropic"]');
        await anthropic.getByText(/privacy tier is local only/).waitFor();
        // The tier is the host's state: the radio flips once the worker has applied it.
        await tab('Privacy');
        await settings.getByLabel(/^Structure Names/).click();
        await tab('Providers');
        await anthropic.getByText('needs an API key').waitFor();
        await anthropic.getByLabel('Anthropic API key').fill(KEY);
        await anthropic.getByRole('button', { name: 'Save' }).click();
        await anthropic.getByText(/key rejected|not reachable/).waitFor();
        assert.equal(await anthropic.getByLabel('Anthropic API key').inputValue(), '', 'the field is cleared');
        assert.match(await anthropic.getByLabel('Anthropic API key').getAttribute('placeholder'), /Key saved/);
        await anthropic.getByText('key saved').waitFor();
        await settings.getByRole('button', { name: 'Close' }).click();

        await node('pkg:rust').click();
        await page.locator('.ca-card .ca-chip', { hasText: 'auto-summary' }).waitFor();
        await page.getByRole('tab', { name: 'Ask' }).click();
        await page.locator('.ca-chat').getByRole('button', { name: 'Set up AI' }).waitFor();

        await page.reload();
        await page.getByRole('button', { name: 'Try the sample' }).click();
        await node('pkg:rust').waitFor();
        await page.getByRole('button', { name: 'AI', exact: true }).click();
        await settings.getByLabel(/^Structure Names/).waitFor();
        assert.equal(await settings.getByLabel(/^Structure Names/).isChecked(), true, 'the tier persists');
        await tab('Providers');
        assert.match(await settings.locator('[data-provider="anthropic"]').getByLabel('Anthropic API key').getAttribute('placeholder'), /Key saved/, 'the key persists');
        const leaked = await page.evaluate(
            (key) =>
                new Promise((resolve) => {
                    const open = indexedDB.open('codearchy-ai');
                    open.onsuccess = () => {
                        const req = open.result.transaction('kv').objectStore('kv').getAll();
                        req.onsuccess = () => {
                            const text = req.result.map((v) => (v instanceof ArrayBuffer ? new TextDecoder().decode(v) : JSON.stringify(v, (_, x) => (x instanceof ArrayBuffer || ArrayBuffer.isView(x) ? new TextDecoder().decode(x) : x)))).join('\n');
                            resolve(text.includes(key));
                        };
                    };
                }),
            KEY,
        );
        assert.equal(leaked, false, 'the key is not stored in plain text');
        assert.ok(probes > 0, 'the probe counter saw the provider checks once AI was used (so the zero above means something)');

        assert.deepEqual(problems, [], 'no CSP violations or page errors');
        console.log(`✓ ${name.padEnd(8)} sample, Map, Inspector, code viewer, zip; AI settings, key encrypted and kept, auto-summary, chat setup; strict CSP (${Date.now() - started} ms)`);
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
