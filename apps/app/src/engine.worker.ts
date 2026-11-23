/** The CodeArchy engine (shared with every browser host), in a module worker. */
import { runEngineWorker } from '@codearchy/platform-browser/engine';
import parseWorkerUrl from './parse.worker.ts?worker&url';
import { ENGINE_BASE } from './generated/engine';

const base = new URL(ENGINE_BASE, self.location.origin).href;

runEngineWorker({
    parseWorkerUrl: new URL(parseWorkerUrl, self.location.origin).href,
    runtimeWasmUrl: `${base}parsers/web-tree-sitter.wasm`,
    grammarBaseUrl: `${base}parsers/`,
    sqliteWasmUrl: `${base}sqlite3.wasm`,
    poolName: 'codearchy-app',
});
