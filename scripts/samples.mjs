#!/usr/bin/env node
/**
 * The sample repositories offered in the web app ("Try a sample") and on codearchy.com: well-known
 * open-source projects that open well by URL (all checked on app.codearchy.com, 2026-11-27).
 *
 * The app and the site build separately (each Docker stage copies only its own folder), so each gets
 * the same samples.json. This script writes both:
 *
 *   node scripts/samples.mjs --icons <simple-icons package dir>   write both copies
 *   node scripts/samples.mjs --check                              fail if the copies differ (CI)
 *
 * Logos: Simple Icons (https://simpleicons.org, CC0), one SVG path each, inlined so the app's CSP
 * (img-src 'self') holds and nothing loads from a third party. Get the package with
 * `npm pack simple-icons@16.37.0` and pass its extracted `package/` folder. A project Simple Icons
 * doesn't have gets a plain glyph of our own (`glyph`), drawn in the text colour, not its brand mark.
 *
 * `site: false` keeps a sample in the app ("Show all") but off codearchy.com, whose grid shows 18.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = ['apps/app/src/samples.json', 'apps/site/src/data/samples.json'].map((p) => path.join(root, p));

/** Our own one-path glyphs, for projects Simple Icons doesn't have. */
const GLYPHS = {
    // A stack of three discs: a database (Dexie wraps IndexedDB).
    database: 'M12 2.5c-4.7 0-8 1.6-8 3.75S7.3 10 12 10s8-1.6 8-3.75S16.7 2.5 12 2.5ZM4 9.2v3.05C4 14.4 7.3 16 12 16s8-1.6 8-3.75V9.2c-1.7 1.4-4.6 2.3-8 2.3s-6.3-.9-8-2.3Zm0 6v3.05C4 20.4 7.3 22 12 22s8-1.6 8-3.75V15.2c-1.7 1.4-4.6 2.3-8 2.3s-6.3-.9-8-2.3Z',
};

// The first nine (featured) open in seconds and span eight languages; the rest show on "Show all".
const SAMPLES = [
    { repo: 'excalidraw/excalidraw', name: 'Excalidraw', language: 'TypeScript', blurb: 'The whiteboard app, a React monorepo', icon: 'excalidraw', files: 736, seconds: 11, featured: true },
    { repo: 'dexie/Dexie.js', name: 'Dexie.js', language: 'TypeScript', blurb: 'The IndexedDB library, with its add-ons', glyph: 'database', files: 654, seconds: 15, featured: true },
    { repo: 'expressjs/express', name: 'Express', language: 'JavaScript', blurb: 'The classic Node.js web framework', icon: 'express', files: 142, seconds: 4, featured: true },
    { repo: 'fastapi/fastapi', name: 'FastAPI', language: 'Python', blurb: 'Modern Python API framework', icon: 'fastapi', files: 1237, seconds: 18, featured: true },
    { repo: 'gin-gonic/gin', name: 'Gin', language: 'Go', blurb: 'Go HTTP web framework', icon: 'gin', files: 99, seconds: 4, featured: true },
    { repo: 'tokio-rs/tokio', name: 'Tokio', language: 'Rust', blurb: 'Async runtime, a Cargo workspace', icon: 'tokio', files: 816, seconds: 14, featured: true },
    { repo: 'dotnet/eShop', name: 'eShop', language: 'C#', blurb: 'Microsoft’s .NET reference architecture', icon: 'dotnet', files: 566, seconds: 11, featured: true },
    { repo: 'android/nowinandroid', name: 'Now in Android', language: 'Kotlin', blurb: 'Google’s Android reference app', icon: 'android', files: 350, seconds: 7, featured: true },
    { repo: 'spring-projects/spring-petclinic', name: 'Spring PetClinic', language: 'Java', blurb: 'Spring’s reference application', icon: 'spring', files: 50, seconds: 3, featured: true },
    { repo: 'honojs/hono', name: 'Hono', language: 'TypeScript', blurb: 'Web framework for every runtime', icon: 'hono', files: 454, seconds: 9, site: false },
    { repo: 'nestjs/nest', name: 'NestJS', language: 'TypeScript', blurb: 'Enterprise Node.js framework, a monorepo', icon: 'nestjs', files: 2388, seconds: 40 },
    { repo: 'vitejs/vite', name: 'Vite', language: 'TypeScript', blurb: 'Frontend build tool', icon: 'vite', files: 1700, seconds: 30 },
    { repo: 'pallets/flask', name: 'Flask', language: 'Python', blurb: 'The Python micro web framework', icon: 'flask', files: 83, seconds: 3 },
    { repo: 'django/django', name: 'Django', language: 'Python', blurb: 'The web framework for perfectionists', icon: 'django', files: 2988, seconds: 43 },
    { repo: 'ollama/ollama', name: 'Ollama', language: 'Go', blurb: 'Run large language models locally', icon: 'ollama', files: 1289, seconds: 21 },
    { repo: 'astral-sh/uv', name: 'uv', language: 'Rust', blurb: 'The fast Python package manager', icon: 'uv', files: 861, seconds: 18 },
    { repo: 'rails/rails', name: 'Ruby on Rails', language: 'Ruby', blurb: 'The full-stack Ruby framework', icon: 'rubyonrails', files: 3590, seconds: 56 },
    { repo: 'mastodon/mastodon', name: 'Mastodon', language: 'Ruby + TS', blurb: 'The federated social network, a full app', icon: 'mastodon', files: 4292, seconds: 62 },
    { repo: 'laravel/framework', name: 'Laravel', language: 'PHP', blurb: 'The PHP web framework', icon: 'laravel', files: 3203, seconds: 50 },
];

const args = process.argv.slice(2);
if (args[0] === '--check') {
    const [a, b] = OUT.map((f) => fs.readFileSync(f, 'utf8'));
    if (a !== b) {
        console.error(`samples.json differs between ${OUT.map((f) => path.relative(root, f)).join(' and ')}: run scripts/samples.mjs --icons <dir>`);
        process.exit(1);
    }
    console.log('samples.json: app and site copies match');
    process.exit(0);
}
const iconsAt = args[0] === '--icons' ? args[1] : undefined;
if (!iconsAt) {
    console.error('usage: node scripts/samples.mjs --icons <simple-icons package dir> | --check');
    process.exit(2);
}
const pkg = JSON.parse(fs.readFileSync(path.join(iconsAt, 'package.json'), 'utf8'));
const data = JSON.parse(fs.readFileSync(path.join(iconsAt, 'data/simple-icons.json'), 'utf8'));
const list = Array.isArray(data) ? data : data.icons;
const slugOf = (i) => i.slug ?? i.title.toLowerCase().replace(/\+/g, 'plus').replace(/\./g, 'dot').replace(/[^a-z0-9]/g, '');
const bySlug = new Map(list.map((i) => [slugOf(i), i]));

/** A brand colour too dark to see on a dark background (black logos) is left out: those draw in the text colour. */
function usable(hex) {
    const [r, g, b] = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
    return 0.2126 * r + 0.7152 * g + 0.0722 * b >= 0.03 ? `#${hex}` : null;
}

const samples = SAMPLES.map(({ icon, glyph, featured, site, ...s }) => {
    const where = { featured: !!featured, ...(site === false ? { site: false } : {}) };
    if (glyph) {
        if (!GLYPHS[glyph]) throw new Error(`no glyph "${glyph}" for ${s.repo}`);
        return { ...s, ...where, logo: { path: GLYPHS[glyph], color: null, title: s.name } };
    }
    const svg = fs.readFileSync(path.join(iconsAt, 'icons', `${icon}.svg`), 'utf8');
    const d = /<path d="([^"]+)"/.exec(svg)?.[1];
    const meta = bySlug.get(icon);
    if (!d || !meta) throw new Error(`no Simple Icons logo "${icon}" for ${s.repo}`);
    return { ...s, ...where, logo: { path: d, color: usable(meta.hex), title: meta.title } };
});
const json = `${JSON.stringify({ $comment: `Generated by scripts/samples.mjs. Logos: Simple Icons ${pkg.version} (CC0), except glyphs of our own where it has none; the names and marks belong to their projects.`, samples }, null, 2)}\n`;
for (const f of OUT) fs.writeFileSync(f, json);
console.log(`${samples.length} samples (${samples.filter((s) => s.featured).length} featured) → ${OUT.map((f) => path.relative(root, f)).join(', ')}`);
