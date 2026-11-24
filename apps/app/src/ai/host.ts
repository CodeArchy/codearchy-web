/**
 * The web app's AI host (loaded on first use, inside the engine worker):
 * @codearchy/ai's AiHost with browser storage.
 *
 *   API keys    IdbSecretStore: AES-GCM under a non-extractable key, on this origin only
 *   settings    IndexedDB (private by default: local only)
 *   usage       IndexedDB
 *   AI cards    IndexedDB, so paid summaries survive a reload
 *
 * Every call goes straight from this browser to the provider: no CodeArchy
 * server sees code or keys. The CSP's connect-src lists exactly these hosts.
 */
import { AiHost, type AiHostOptions, type Card, type CardStore, type ProviderFactory } from '@codearchy/ai';
import type { AiHostEvent } from '@codearchy/protocol';
import { anthropic, gemini, groq, lmStudio, mistral, ollama, openai, openrouter, type UsageStore } from '@codearchy/providers';
import { IdbKeyValue, IdbSecretStore } from '@codearchy/platform-browser/stores';

export interface BrowserAiHostOptions {
    index: AiHostOptions['index'];
    /** Entrypoints and flows for the open workspace (chat's find_flows). */
    flows: NonNullable<AiHostOptions['flows']>;
    readFile(path: string): Promise<string | undefined>;
    emit(event: AiHostEvent): void;
}

export function createBrowserAiHost(options: BrowserAiHostOptions): AiHost {
    const kv = new IdbKeyValue('codearchy-ai');
    const origin = self.location.origin;
    const usage: UsageStore = {
        get: (key) => kv.get<number>(`usage:${key}`),
        set: (key, value) => kv.set(`usage:${key}`, value),
    };
    const providers: ProviderFactory[] = [
        {
            id: 'ollama',
            label: 'Ollama',
            acceptsKey: false,
            setup: {
                title: `Let this page reach Ollama on this machine`,
                steps: [
                    `Allow ${origin} in Ollama's OLLAMA_ORIGINS, then quit and reopen Ollama:`,
                    `macOS: launchctl setenv OLLAMA_ORIGINS "${origin}"`,
                    `Windows: setx OLLAMA_ORIGINS "${origin}"`,
                    `Linux: sudo systemctl edit ollama, add Environment="OLLAMA_ORIGINS=${origin}" under [Service], then sudo systemctl restart ollama`,
                    'Pull a model with tool support (for example: ollama pull qwen3), then choose "Check providers"',
                    'If the browser asks whether this site may access devices on your local network, allow it',
                ],
            },
            create: () => ollama(),
        },
        {
            id: 'lmstudio',
            label: 'LM Studio',
            acceptsKey: false,
            setup: { title: 'Let this page reach LM Studio', steps: ["In LM Studio's Developer tab, start the server and turn on CORS", 'Then choose "Check providers"'] },
            create: () => lmStudio(),
        },
        { id: 'anthropic', label: 'Anthropic', acceptsKey: true, create: (apiKey) => anthropic({ apiKey }) },
        { id: 'openai', label: 'OpenAI', acceptsKey: true, create: (apiKey) => openai({ apiKey }) },
        { id: 'gemini', label: 'Google Gemini', acceptsKey: true, create: (apiKey) => gemini({ apiKey }) },
        { id: 'openrouter', label: 'OpenRouter', acceptsKey: true, create: (apiKey) => openrouter({ apiKey }) },
        { id: 'groq', label: 'Groq', acceptsKey: true, create: (apiKey) => groq({ apiKey }) },
        { id: 'mistral', label: 'Mistral', acceptsKey: true, create: (apiKey) => mistral({ apiKey }) },
    ];
    return new AiHost({
        index: options.index,
        flows: options.flows,
        readFile: options.readFile,
        providers,
        secrets: new IdbSecretStore(kv),
        settings: { load: () => kv.get('settings'), save: (s) => kv.set('settings', s) },
        usage,
        cards: new IdbCardStore(kv),
        emit: options.emit,
    });
}

/** AI cards in IndexedDB; auto-built cards stay in memory (they're cheap to rebuild). */
class IdbCardStore implements CardStore {
    private readonly memory = new Map<string, Card>();
    private readonly latestInMemory = new Map<string, Card>();
    constructor(private readonly kv: IdbKeyValue) {}

    async get(inputHash: string) {
        return this.memory.get(inputHash) ?? (await this.kv.get<Card>(`card:${inputHash}`));
    }
    async latest(key: string) {
        return this.latestInMemory.get(key) ?? (await this.kv.get<Card>(`latest:${key}`));
    }
    async put(card: Card) {
        this.latestInMemory.set(card.key, card);
        if (card.source !== 'ai') return void this.memory.set(card.inputHash, card);
        await this.kv.set(`card:${card.inputHash}`, card);
        await this.kv.set(`latest:${card.key}`, card);
    }
}
