/**
 * The AI side of the engine worker, as engine handlers:
 *
 *   ai      { method, params }                 an AiClient request (state, card, setKey…)
 *   aiAsk   { conversation, question, selection? }   streams { channel: 'aiChat' } events, then resolves
 *
 * The AI host and the providers load on first use, as their own chunk, so the
 * app pays nothing for AI until someone opens the Ask panel or AI settings.
 */
import type { EngineHandler, EngineWorkspace, HandlerContext } from '@codearchy/platform-browser/engine';
import type { AiHost } from '@codearchy/ai';

/** The open workspace and a way to reach the page: the latest ones a request brought. */
let workspace: EngineWorkspace | undefined;
let page: HandlerContext | undefined;
let host: Promise<AiHost> | undefined;

function aiHost(): Promise<AiHost> {
    host ??= import('./host').then(({ createBrowserAiHost }) =>
        createBrowserAiHost({
            index: () => workspace?.hierarchy,
            flows: () => workspace?.flows,
            readFile: async (path) => {
                if (!workspace) return undefined;
                try {
                    return await workspace.fs.readText(path);
                } catch {
                    return undefined;
                }
            },
            emit: (event) => page?.emit({ channel: 'ai', event }),
        }),
    );
    return host;
}

const remember = (ws: EngineWorkspace, ctx: HandlerContext) => {
    workspace = ws;
    page = ctx;
};

export const aiHandlers: Record<string, EngineHandler> = {
    ai: async (ws, params, ctx) => {
        remember(ws, ctx);
        const method = typeof params.method === 'string' ? params.method : '';
        const args = params.params && typeof params.params === 'object' ? (params.params as Record<string, unknown>) : {};
        return (await aiHost()).handle(method, args);
    },
    aiAsk: async (ws, params, ctx) => {
        remember(ws, ctx);
        const conversation = String(params.conversation ?? '');
        const selection = typeof params.selection === 'string' ? params.selection : undefined;
        await (await aiHost()).ask(conversation, String(params.question ?? ''), { selection }, (event) => ctx.emit({ channel: 'aiChat', conversation, event }));
        return true;
    },
};
