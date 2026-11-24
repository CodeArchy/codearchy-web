/**
 * The page's AiClient: requests go to the engine worker's `ai` / `aiAsk`
 * handlers; streamed answers and host events come back as host events.
 */
import type { AiClient, AiHostEvent, ChatEvent } from '@codearchy/protocol';
import type { WorkerEngine } from '@codearchy/platform-browser/client';

export function workerAiClient(engine: WorkerEngine): AiClient {
    const chats = new Map<string, (event: ChatEvent) => void>();
    const listeners = new Set<(event: AiHostEvent) => void>();

    engine.onHostEvent((raw) => {
        const msg = raw as { channel?: unknown; conversation?: unknown; event?: unknown };
        if (msg?.channel === 'aiChat') {
            // Only conversations this page started, and only functions, get called.
            if (typeof msg.conversation !== 'string' || !chats.has(msg.conversation)) return;
            const handler = chats.get(msg.conversation);
            if (typeof handler === 'function') handler(msg.event as ChatEvent);
        } else if (msg?.channel === 'ai') {
            for (const l of listeners) l(msg.event as AiHostEvent);
        }
    });

    const call = <T>(method: string, params: Record<string, unknown> = {}) => engine.call<T>('ai', { method, params });

    return {
        state: () => call('state'),
        refresh: () => call('refresh'),
        updateSettings: (patch) => call('updateSettings', { patch }),
        setKey: (provider, key) => call('setKey', { provider, key }),
        card: (key, options) => call('card', { key, generate: options?.generate === true }),
        async ask(conversation, question, options, onEvent) {
            chats.set(conversation, onEvent);
            try {
                await engine.call('aiAsk', { conversation, question, selection: options.selection });
            } catch (err) {
                onEvent({ type: 'error', code: 'unavailable', message: err instanceof Error ? err.message : String(err) });
            } finally {
                chats.delete(conversation);
            }
        },
        cancel: (conversation) => void call('cancel', { conversation }),
        reset: (conversation) => void call('reset', { conversation }),
        answerPreview: (id, send) => void call('answerPreview', { id, send }),
        subscribe(listener) {
            listeners.add(listener);
            return () => listeners.delete(listener);
        },
        audit: () => call('audit'),
        localModels: (provider) => call('localModels', { provider }),
        pullModel: (provider, model) => call('pullModel', { provider, model }),
        cancelPull: (provider, model) => void call('cancelPull', { provider, model }),
        deleteModel: (provider, model) => call('deleteModel', { provider, model }),
        describeArchitecture: (options) => call('describeArchitecture', { generate: options?.generate === true }),
    };
}
