#!/usr/bin/env node
/**
 * The @codearchy/* packages the web app needs come from a checkout of the
 * codearchy repository in .codearchy/ (git-ignored), not from npm:
 *
 *   node scripts/codearchy.mjs fetch          check out the commit pinned in codearchy.json
 *   node scripts/codearchy.mjs link <path>    use a local checkout instead (symlink; installs,
 *                                             keeping the committed lockfile)
 *   node scripts/codearchy.mjs build          build the packages the app depends on
 *   node scripts/codearchy.mjs status
 *
 * pnpm-workspace.yaml includes .codearchy/packages/*, so the app depends on
 * them as `workspace:*` and nothing in the app changes when they move to npm.
 */
import { execFileSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIR = path.join(ROOT, '.codearchy');
const pin = JSON.parse(fs.readFileSync(path.join(ROOT, 'codearchy.json'), 'utf8'));
const git = (...args) => execFileSync('git', args, { cwd: DIR, stdio: ['ignore', 'pipe', 'inherit'] }).toString().trim();
const isLink = () => fs.existsSync(DIR) && fs.lstatSync(DIR).isSymbolicLink();

const [command, arg] = process.argv.slice(2);

if (command === 'fetch') {
    if (isLink()) {
        console.log(`.codearchy links to ${fs.readlinkSync(DIR)}; remove the link to use the pinned commit.`);
        process.exit(0);
    }
    if (fs.existsSync(path.join(DIR, '.git')) && git('rev-parse', 'HEAD') === pin.commit) {
        console.log(`.codearchy is at ${pin.commit.slice(0, 12)}`);
        process.exit(0);
    }
    fs.rmSync(DIR, { recursive: true, force: true });
    fs.mkdirSync(DIR);
    git('init', '-q');
    git('remote', 'add', 'origin', pin.repository);
    git('fetch', '-q', '--depth', '1', 'origin', pin.commit);
    git('checkout', '-q', 'FETCH_HEAD');
    console.log(`.codearchy checked out at ${pin.commit.slice(0, 12)} from ${pin.repository}`);
} else if (command === 'link') {
    if (!arg) throw new Error('usage: pnpm dev:link <path to a codearchy checkout>');
    const target = path.resolve(arg);
    if (!fs.existsSync(path.join(target, 'packages', 'core', 'package.json'))) throw new Error(`${target} doesn't look like a codearchy checkout`);
    fs.rmSync(DIR, { recursive: true, force: true });
    fs.symlinkSync(target, DIR, 'dir');
    // Through a symlink pnpm records the packages as plain links, so the lockfile
    // would differ from the committed one (made from a real checkout, as in Docker).
    // Install without freezing, then put the committed lockfile back.
    const run = (cmd, args) => execFileSync(cmd, args, { cwd: ROOT, stdio: 'inherit', shell: process.platform === 'win32' });
    run('pnpm', ['install', '--no-frozen-lockfile']);
    run('git', ['checkout', '--', 'pnpm-lock.yaml']);
    console.log(`.codearchy → ${target}. Build its packages with \`pnpm codearchy:build\`. To go back: remove .codearchy, then \`pnpm codearchy:fetch && pnpm install\`.`);
} else if (command === 'build') {
    // Every workspace package the app depends on, in dependency order (grammars' build fetches its .wasm files).
    execFileSync('pnpm', ['--filter', '@codearchy/app^...', '-r', 'run', 'build'], { cwd: ROOT, stdio: 'inherit', shell: process.platform === 'win32' });
} else if (command === 'status') {
    if (!fs.existsSync(DIR)) console.log('.codearchy: missing (run pnpm codearchy:fetch)');
    else if (isLink()) console.log(`.codearchy: linked to ${fs.readlinkSync(DIR)}`);
    else console.log(`.codearchy: ${git('rev-parse', 'HEAD')} (pinned ${pin.commit})`);
} else {
    console.log('usage: node scripts/codearchy.mjs fetch | link <path> | build | status');
    process.exit(command ? 1 : 0);
}
