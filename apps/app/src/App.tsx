/**
 * The CodeArchy web app: open a folder, a .zip or the sample; the engine
 * indexes it in this browser (nothing is uploaded) and the Map shows its
 * architecture. A picked folder stays live: edits on disk show up in place.
 *
 * With the Companion (`codearchy serve`), the engine runs natively on this
 * machine instead: its pairing link (`#pair=<token>@127.0.0.1:<port>`) opens
 * the app connected, and the session is kept for this tab so a reload
 * reconnects without a new link.
 */
import { useEffect, useMemo, useRef, useState, type ChangeEvent, type DragEvent } from 'react';
import { CodeArchyMap, Icon } from '@codearchy/ui';
import type { AuthorshipOrigin, AuthorshipRange, EngineClient, WorkspaceSummary } from '@codearchy/protocol';
import { CompanionEngine, parsePairing, type CompanionTarget } from '@codearchy/platform-browser/companion';
import { WorkerEngine, canPickDirectory, parseRepositoryUrl, pickDirectory, sourceFromDrop, sourceFromFileList, sourceFromRepository, sourceFromZip, type EngineSource } from '@codearchy/platform-browser/client';
import { workerAiClient } from './ai/client';
import { CodeViewer } from './CodeViewer';
import { BranchReportDialog } from './BranchReport';
import { ENGINE_BASE } from './generated/engine';
import { Logo, OpenActions, OpeningCard, ThemeSwitch, useTheme, type Opening } from './chrome';
import { webVoiceClient } from './voice/voice';

type Phase = { kind: 'landing' } | { kind: 'ready' };

/** The Companion session for this tab (sessionStorage: it ends with the tab). */
const COMPANION_KEY = 'codearchy.companion';
type SavedCompanion = CompanionTarget & { session: string };
function savedCompanion(): SavedCompanion | undefined {
    try {
        const raw = JSON.parse(sessionStorage.getItem(COMPANION_KEY) ?? 'null') as SavedCompanion | null;
        return raw && typeof raw.session === 'string' && (raw.host === '127.0.0.1' || raw.host === 'localhost') && Number.isInteger(raw.port) ? raw : undefined;
    } catch {
        return undefined;
    }
}
function saveCompanion(c: SavedCompanion | undefined): void {
    try {
        if (c) sessionStorage.setItem(COMPANION_KEY, JSON.stringify(c));
        else sessionStorage.removeItem(COMPANION_KEY);
    } catch {
        // storage blocked: a reload will just need a new link
    }
}
interface Viewer {
    path: string;
    line?: number;
    text: string;
}

export function App() {
    const engine = useMemo(() => new WorkerEngine(new Worker(new URL('./engine.worker.ts', import.meta.url), { type: 'module' })), []);
    const ai = useMemo(() => workerAiClient(engine), [engine]);
    const voice = useMemo(() => webVoiceClient(), []);
    /** Set while connected to `codearchy serve`; the in-browser engine is used otherwise. */
    const [companion, setCompanion] = useState<{ engine: CompanionEngine; target: CompanionTarget; version: string }>();
    const [disconnected, setDisconnected] = useState<string>();
    const [pairLink, setPairLink] = useState('');
    const [reportOpen, setReportOpen] = useState(false);
    const client: EngineClient & { readFile(path: string): Promise<string | undefined> } = companion?.engine ?? engine;
    const [phase, setPhase] = useState<Phase>({ kind: 'landing' });
    const [summary, setSummary] = useState<WorkspaceSummary>();
    const [error, setError] = useState<string>();
    const [revision, setRevision] = useState(0);
    const [dataVersion, setDataVersion] = useState(0);
    const [notice, setNotice] = useState<string>();
    const [viewer, setViewer] = useState<Viewer>();
    const [dragging, setDragging] = useState(false);
    /** What opening a codebase is doing (from the moment a picker opens). */
    const [opening, setOpening] = useState<Opening>();
    /** "Open…" over the current workspace (it stays until the new one is ready). */
    const [openDialog, setOpenDialog] = useState(false);
    const folderInput = useRef<HTMLInputElement>(null);
    const zipInput = useRef<HTMLInputElement>(null);
    const { theme, setTheme, dark } = useTheme();
    const begin = (label: string, step: Opening['step']) => {
        setError(undefined);
        setOpening({ label, step, started: Date.now() });
    };

    // A file picker closed without a choice: back to where we were.
    useEffect(() => {
        const inputs = [folderInput.current, zipInput.current].filter((x): x is HTMLInputElement => !!x);
        const cancel = () => setOpening((o) => (o?.step === 'choosing' ? undefined : o));
        for (const i of inputs) i.addEventListener('cancel', cancel);
        return () => inputs.forEach((i) => i.removeEventListener('cancel', cancel));
    }, []);

    useEffect(
        () =>
            engine.onEvent((e) => {
                if (e.type === 'progress') {
                    setOpening((o) => (o ? { ...o, step: 'indexing', progress: { phase: e.phase, current: e.current, total: e.total } } : o));
                } else {
                    setSummary(e.summary);
                    setDataVersion((v) => v + 1);
                    setNotice(`${e.paths.length} file${e.paths.length === 1 ? '' : 's'} changed on disk`);
                }
            }),
        [engine]
    );

    const connectCompanion = async (target: CompanionTarget, auth: { token: string } | { session: string }) => {
        setError(undefined);
        setNotice(undefined);
        setViewer(undefined);
        setDisconnected(undefined);
        begin(`the Companion on port ${target.port}`, 'reading');
        try {
            const c = await CompanionEngine.connect(target, auth);
            saveCompanion({ ...target, session: c.session });
            c.engine.onEvent((e) => {
                if (e.type !== 'changed') return;
                setSummary(e.summary);
                setDataVersion((v) => v + 1);
                setNotice(`${e.paths.length} file${e.paths.length === 1 ? '' : 's'} changed on disk`);
            });
            c.engine.onClose((err) => setDisconnected(err.message));
            companion?.engine.dispose();
            setCompanion({ engine: c.engine, target, version: c.version });
            setSummary(c.summary);
            setRevision((r) => r + 1);
            setPhase({ kind: 'ready' });
            setOpenDialog(false);
        } catch (err) {
            if ('session' in auth) saveCompanion(undefined);
            setError((err as Error).message);
        } finally {
            setOpening(undefined);
        }
    };
    const leaveCompanion = () => {
        companion?.engine.dispose();
        setCompanion(undefined);
        setDisconnected(undefined);
        saveCompanion(undefined);
    };

    // A pairing link opens the app connected (the token is dropped from the address bar), also
    // when it's opened in a tab that already shows the app; otherwise this tab's session reconnects.
    useEffect(() => {
        const pairFromHash = () => {
            const pairing = parsePairing(location.hash);
            if (!pairing) return false;
            history.replaceState(null, '', location.pathname + location.search);
            void connectCompanion({ host: pairing.host, port: pairing.port }, { token: pairing.token });
            return true;
        };
        if (!pairFromHash()) {
            const saved = savedCompanion();
            if (saved) void connectCompanion({ host: saved.host, port: saved.port }, { session: saved.session });
        }
        const onHash = () => void pairFromHash();
        window.addEventListener('hashchange', onHash);
        return () => window.removeEventListener('hashchange', onHash);
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const pastePairing = () => {
        const hash = pairLink.trim().includes('#') ? pairLink.trim().slice(pairLink.trim().indexOf('#')) : pairLink.trim();
        const pairing = parsePairing(hash);
        if (!pairing) return setError('That is not a Companion link: run `npx codearchy serve --root .` in your repository and copy the link it prints.');
        setPairLink('');
        void connectCompanion({ host: pairing.host, port: pairing.port }, { token: pairing.token });
    };

    /** Indexes a source; the current workspace (if any) stays on screen until the new one is ready. */
    const open = async (source: EngineSource | undefined, label: string, remote?: 'GitHub' | 'GitLab') => {
        if (!source) return setOpening(undefined);
        leaveCompanion();
        setError(undefined);
        setNotice(undefined);
        setOpening((o) => ({ label, step: 'indexing', started: o?.started ?? Date.now(), ...(remote ? { remote } : {}) }));
        try {
            const s = await engine.open(source);
            setViewer(undefined);
            setSummary(s);
            setRevision((r) => r + 1);
            setPhase({ kind: 'ready' });
            setOpenDialog(false);
        } catch (err) {
            setError((err as Error).message.split('\n')[0]!.replace(/^[A-Za-z]*Error: /, ''));
        } finally {
            setOpening(undefined);
        }
    };

    /** A public GitHub or GitLab repository, by URL: the engine worker downloads only the files it reads. */
    const [repoUrl, setRepoUrl] = useState('');
    const openRepository = (url: string) => {
        const ref = parseRepositoryUrl(url);
        if (!ref) return setError('That isn’t a GitHub or GitLab repository URL. Try https://github.com/owner/repo.');
        void open(sourceFromRepository(url), ref.path, ref.host === 'github' ? 'GitHub' : 'GitLab');
    };
    // ?repo=owner/repo (a shared link) opens that repository straight away.
    useEffect(() => {
        const repo = new URLSearchParams(location.search).get('repo');
        if (repo && !parsePairing(location.hash)) openRepository(repo);
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const openFolder = async () => {
        begin('a folder', 'choosing');
        if (!canPickDirectory()) return folderInput.current?.click();
        try {
            const source = await pickDirectory();
            await open(source, source?.kind === 'handle' ? source.handle.name : 'the folder');
        } catch (err) {
            setOpening(undefined);
            setError((err as Error).message);
        }
    };
    const openZip = () => {
        begin('a .zip', 'choosing');
        zipInput.current?.click();
    };
    const openSample = async () => {
        begin('the sample', 'reading');
        try {
            const files: Record<string, string> = await (await fetch(`${ENGINE_BASE}samples/polyglot.json`)).json();
            await open({ kind: 'texts', name: 'polyglot sample', files }, 'the sample');
        } catch (err) {
            setOpening(undefined);
            setError((err as Error).message);
        }
    };
    const onFolderInput = (e: ChangeEvent<HTMLInputElement>) => {
        const list = e.target.files ?? [];
        const name = (list[0] as (File & { webkitRelativePath?: string }) | undefined)?.webkitRelativePath?.split('/')[0];
        begin(name ?? 'the folder', 'reading');
        const source = sourceFromFileList(list);
        e.target.value = '';
        void open(source, name ?? 'the folder');
    };
    const onZipInput = async (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        e.target.value = '';
        if (!file) return setOpening(undefined);
        begin(file.name, 'reading');
        try {
            await open(await sourceFromZip(file), file.name);
        } catch (err) {
            setOpening(undefined);
            setError((err as Error).message);
        }
    };
    const onDrop = (e: DragEvent) => {
        e.preventDefault();
        setDragging(false);
        // The drop's items are read before anything awaits; then the card shows at once.
        const pending = sourceFromDrop(e.dataTransfer);
        begin('the dropped item', 'reading');
        void pending.then(
            (s) => open(s, 'the dropped item'),
            (err: unknown) => {
                setOpening(undefined);
                setError(err instanceof Error ? err.message : String(err));
            }
        );
    };
    const openActions = (
        <OpenActions
            onFolder={() => void openFolder()}
            onZip={openZip}
            onSample={() => void openSample()}
            onSampleRepo={(repo) => openRepository(repo)}
            repoUrl={repoUrl}
            onRepoUrl={setRepoUrl}
            onRepo={() => openRepository(repoUrl)}
            canWatch={canPickDirectory()}
            pairLink={pairLink}
            onPairLink={setPairLink}
            onPair={pastePairing}
        />
    );
    const cancelChoosing = opening?.step === 'choosing' ? () => setOpening(undefined) : undefined;

    const openFile = async (path: string, line?: number) => {
        const text = await client.readFile(path);
        if (text !== undefined) setViewer({ path, line, text });
    };

    // With the Companion, the viewer shows the file's authorship (and lets you review / correct it).
    const [viewerRanges, setViewerRanges] = useState<AuthorshipRange[]>();
    useEffect(() => {
        let live = true;
        setViewerRanges(undefined);
        if (companion && viewer) void companion.engine.authorship(`mod:${viewer.path}`).then((a) => live && setViewerRanges(a?.ranges ?? []), () => undefined);
        return () => {
            live = false;
        };
    }, [companion, viewer?.path, dataVersion]); // eslint-disable-line react-hooks/exhaustive-deps
    const viewerAuthorship =
        companion && viewer && viewerRanges
            ? {
                  ranges: viewerRanges,
                  mark: async (start: number, end: number, as: 'reviewed' | AuthorshipOrigin) => {
                      const result = await companion.engine.authorshipMark(viewer.path, start, end, as);
                      const a = await companion.engine.authorship(`mod:${viewer.path}`);
                      setViewerRanges(a?.ranges ?? []);
                      return result;
                  },
              }
            : undefined;

    return (
        <div
            className={`app${dragging ? ' app-dragging' : ''}`}
            onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
            }}
            onDragLeave={(e) => e.currentTarget === e.target && setDragging(false)}
            onDrop={onDrop}
        >
            <input ref={folderInput} type="file" hidden onChange={onFolderInput} {...{ webkitdirectory: '', directory: '' }} />
            <input ref={zipInput} type="file" hidden accept=".zip,application/zip" onChange={(e) => void onZipInput(e)} />

            {phase.kind === 'ready' && summary ? (
                <div className="workspace">
                    <CodeArchyMap
                        client={client}
                        host={{ openFile: (p, l) => void openFile(p, l) }}
                        layoutWorkerUrl={`${ENGINE_BASE}elk-worker.js`}
                        hostKind="web"
                        theme={theme}
                        revision={String(revision)}
                        // Chat history, tour drafts and progress are kept per codebase, across reloads.
                        workspace={`${companion ? 'companion' : summary.storage}:${summary.name}`}
                        dataVersion={dataVersion}
                        // AI runs beside the in-browser engine; with the Companion it comes in a later release.
                        ai={companion ? undefined : ai}
                        voice={voice}
                        toolbarStart={
                            <button type="button" className="brand" title="CodeArchy: open another codebase" onClick={() => setOpenDialog(true)}>
                                <Logo size={20} />
                                <span>CodeArchy</span>
                            </button>
                        }
                        toolbarExtras={
                            <>
                                <span
                                    className="status"
                                    title={`${summary.files.toLocaleString()} files · ${summary.edges.toLocaleString()} dependencies · ${
                                        summary.storage === 'native' ? `indexed by the Companion (codearchy ${companion?.version ?? ''}) on this machine` : `index in ${summary.storage === 'opfs' ? 'browser storage' : 'memory'}`
                                    }`}
                                >
                                    {companion ? <span className="companion-badge">Companion</span> : null}
                                    {summary.live && !disconnected ? <span className="live" aria-label="watching for changes">● live</span> : null} {notice ?? `${summary.files.toLocaleString()} files`}
                                </span>
                                {disconnected && companion ? (
                                    <span className="disconnected" role="alert" title={disconnected}>
                                        Companion disconnected{' '}
                                        <button type="button" className="link" onClick={() => {
                                            const saved = savedCompanion();
                                            if (saved) void connectCompanion({ host: saved.host, port: saved.port }, { session: saved.session });
                                        }}>
                                            Reconnect
                                        </button>
                                    </span>
                                ) : null}
                                {companion ? (
                                    <button type="button" className="ca-search-button" title="What this branch adds, and who wrote it" onClick={() => setReportOpen(true)}>
                                        Branch report
                                    </button>
                                ) : null}
                                <ThemeSwitch theme={theme} onChange={setTheme} compact />
                                <button type="button" className="ca-search-button open-button" title="Open another codebase" onClick={() => setOpenDialog(true)}>
                                    <Icon name="plus" size={13} /> Open…
                                </button>
                            </>
                        }
                    />
                    {reportOpen && companion ? <BranchReportDialog engine={companion.engine} onClose={() => setReportOpen(false)} /> : null}
                    {viewer ? <CodeViewer {...viewer} dark={dark} onClose={() => setViewer(undefined)} authorship={viewerAuthorship} /> : null}
                    {openDialog || opening ? (
                        <div className="open-backdrop" onClick={(e) => e.target === e.currentTarget && !opening && setOpenDialog(false)} onKeyDown={(e) => e.key === 'Escape' && !opening && setOpenDialog(false)}>
                            <div className="open-dialog" role="dialog" aria-modal="true" aria-label="Open another codebase">
                                <header>
                                    <h2>{opening ? 'Opening…' : 'Open another codebase'}</h2>
                                    <span className="muted">{summary.name} stays open until the new one is ready.</span>
                                    <button type="button" className="icon" aria-label="Close" title="Close" disabled={!!opening && opening.step !== 'choosing'} onClick={() => (setOpening(undefined), setOpenDialog(false))}>
                                        <Icon name="close" size={16} />
                                    </button>
                                </header>
                                {opening ? <OpeningCard opening={opening} onCancel={cancelChoosing} /> : openActions}
                                {error ? (
                                    <p className="error" role="alert">
                                        Could not open it: {error}
                                    </p>
                                ) : null}
                            </div>
                        </div>
                    ) : null}
                </div>
            ) : (
                <main className="landing">
                    <div className="landing-top">
                        <ThemeSwitch theme={theme} onChange={setTheme} />
                    </div>
                    <h1>
                        <Logo size={44} /> CodeArchy
                    </h1>
                    <p className="tagline">See the architecture of any codebase: packages, components, dependencies and cycles, explored from the top down on one canvas.</p>
                    <p className="privacy">Everything runs in this browser: your code is never uploaded to CodeArchy. AI is optional and off by default; turned on, it talks straight to the provider you choose, within the privacy level you set.</p>
                    {opening ? (
                        <OpeningCard opening={opening} onCancel={cancelChoosing} />
                    ) : (
                        <>
                            {openActions}
                            {summary ? (
                                <p>
                                    <button type="button" className="link" onClick={() => setPhase({ kind: 'ready' })}>
                                        Back to {summary.name}
                                    </button>
                                </p>
                            ) : null}
                        </>
                    )}
                    {error ? (
                        <p className="error" role="alert">
                            Could not open it: {error}
                        </p>
                    ) : null}
                    <p className="muted small">
                        TypeScript, JavaScript, Python, Java, Kotlin, Go, Rust, C#, PHP and Ruby. Open source:{' '}
                        <a href="https://github.com/CodeArchy/codearchy" rel="noopener noreferrer">
                            github.com/CodeArchy/codearchy
                        </a>
                        .
                    </p>
                </main>
            )}
            {dragging ? <div className="drop-hint">Drop a folder or a .zip to open it</div> : null}
        </div>
    );
}
