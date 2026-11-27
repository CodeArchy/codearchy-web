/**
 * The app's own chrome around the Map: the logo, the theme switch, the
 * "open a codebase" actions (landing page and the Open dialog) and the card
 * that shows what opening is doing, from the moment you pick something.
 */
import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import { Icon } from '@codearchy/ui';
import SAMPLES from './samples.json';

// ─── logo ───────────────────────────────────────────────────────────────────

/** The CodeArchy mark (the dark one; on a dark page it sits on a light tile). */
export function Logo({ size }: { size: number }) {
    return (
        <span className="logo-tile" style={{ width: size, height: size }}>
            <img src="/brand/logo-dark.png" alt="" width={size} height={size} className="logo" />
        </span>
    );
}

// ─── theme ──────────────────────────────────────────────────────────────────

export type Theme = 'system' | 'light' | 'dark';
const THEME_KEY = 'codearchy.theme';

function savedTheme(): Theme {
    try {
        const t = localStorage.getItem(THEME_KEY);
        return t === 'light' || t === 'dark' ? t : 'system';
    } catch {
        return 'system';
    }
}

/** The viewer's theme (remembered), applied to the page, and whether it's dark right now. */
export function useTheme(): { theme: Theme; setTheme(t: Theme): void; dark: boolean } {
    const [theme, set] = useState<Theme>(savedTheme);
    const query = useMemo(() => window.matchMedia('(prefers-color-scheme: dark)'), []);
    const [systemDark, setSystemDark] = useState(query.matches);
    useEffect(() => {
        const on = () => setSystemDark(query.matches);
        query.addEventListener('change', on);
        return () => query.removeEventListener('change', on);
    }, [query]);
    const dark = theme === 'dark' || (theme === 'system' && systemDark);
    useEffect(() => {
        const root = document.documentElement;
        if (theme === 'system') delete root.dataset.theme;
        else root.dataset.theme = theme;
        document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#15171c' : '#ffffff');
    }, [theme, dark]);
    const setTheme = (t: Theme) => {
        set(t);
        try {
            if (t === 'system') localStorage.removeItem(THEME_KEY);
            else localStorage.setItem(THEME_KEY, t);
        } catch {
            // storage blocked: the choice lasts for this tab
        }
    };
    return { theme, setTheme, dark };
}

const THEMES: Array<{ id: Theme; label: string; icon: ReactNode }> = [
    { id: 'system', label: 'System', icon: <MonitorIcon /> },
    { id: 'light', label: 'Light', icon: <SunIcon /> },
    { id: 'dark', label: 'Dark', icon: <MoonIcon /> },
];

/** Light / Dark / System: a three-way switch, or (compact, in the toolbar) one button that cycles. */
export function ThemeSwitch({ theme, onChange, compact }: { theme: Theme; onChange(t: Theme): void; compact?: boolean }) {
    if (compact) {
        const i = THEMES.findIndex((t) => t.id === theme);
        const next = THEMES[(i + 1) % THEMES.length]!;
        return (
            <button type="button" className="ca-icon-button theme-cycle" title={`Theme: ${THEMES[i]!.label} (click for ${next.label})`} aria-label={`Theme: ${THEMES[i]!.label}. Switch to ${next.label}`} onClick={() => onChange(next.id)}>
                {THEMES[i]!.icon}
            </button>
        );
    }
    return (
        <div className={`theme-switch${compact ? ' compact' : ''}`} role="radiogroup" aria-label="Theme">
            {THEMES.map((t) => (
                <button key={t.id} type="button" role="radio" aria-checked={theme === t.id} title={`${t.label} theme`} aria-label={`${t.label} theme`} className={theme === t.id ? 'on' : ''} onClick={() => onChange(t.id)}>
                    {t.icon}
                    {compact ? null : <span>{t.label}</span>}
                </button>
            ))}
        </div>
    );
}

function svg(children: ReactNode) {
    return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            {children}
        </svg>
    );
}
function SunIcon() {
    return svg(
        <>
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2.5v2M12 19.5v2M4.6 4.6 6 6M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4" />
        </>
    );
}
function MoonIcon() {
    return svg(<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" />);
}
function MonitorIcon() {
    return svg(
        <>
            <rect x="3" y="4" width="18" height="12" rx="2" />
            <path d="M8 20h8M12 16v4" />
        </>
    );
}

// ─── opening a codebase ─────────────────────────────────────────────────────

export interface Opening {
    label: string;
    /** choosing: the picker is open · reading: files or the zip are read · indexing: the engine runs. */
    step: 'choosing' | 'reading' | 'indexing';
    /** The engine's own progress (download, checking, parsing, saving). */
    progress?: { phase: string; current: number; total: number };
    started: number;
    /** Downloaded from GitHub or GitLab (a repository URL), instead of read from this machine. */
    remote?: 'GitHub' | 'GitLab';
}

const STEPS = [
    { id: 'read', label: 'Read the files', hint: 'Straight from your disk into this tab' },
    { id: 'parse', label: 'Parse the code', hint: 'Tree-sitter, in background workers' },
    { id: 'build', label: 'Build the map', hint: 'Dependencies, parts and flows' },
] as const;

function activeStep(o: Opening): number {
    if (o.step !== 'indexing' || !o.progress) return 0;
    if (o.progress.phase === 'download' || o.progress.phase === 'checking') return 0;
    if (o.progress.phase === 'parsing') return o.progress.current >= o.progress.total ? 2 : 1;
    return 2;
}

/** What opening is doing right now: the step, the numbers, and how long it has taken. */
export function OpeningCard({ opening, onCancel }: { opening: Opening; onCancel?(): void }) {
    const [, tick] = useState(0);
    useEffect(() => {
        const t = setInterval(() => tick((n) => n + 1), 500);
        return () => clearInterval(t);
    }, []);
    const seconds = Math.max(0, Math.round((Date.now() - opening.started) / 1000));
    if (opening.step === 'choosing') {
        return (
            <div className="opening" role="status" aria-live="polite">
                <div className="opening-head">
                    <span className="opening-icon">
                        <Icon name="upload" size={18} />
                    </span>
                    <div>
                        <strong>Choose {opening.label} in the dialog…</strong>
                        <p className="muted">Big folders can take a few seconds to appear after you choose them: the browser lists every file first.</p>
                    </div>
                </div>
                {onCancel ? (
                    <div className="opening-actions">
                        <button type="button" onClick={onCancel}>
                            Cancel
                        </button>
                    </div>
                ) : null}
            </div>
        );
    }
    const step = activeStep(opening);
    const p = opening.progress;
    const counted = (p?.phase === 'parsing' || p?.phase === 'download') && p.total > 0;
    const pct = counted ? Math.min(100, Math.round((p.current / p.total) * 100)) : undefined;
    const detail =
        opening.step === 'reading'
            ? `Reading ${opening.label}…`
            : !p
              ? opening.remote
                  ? `Asking ${opening.remote} for the files…`
                  : 'Starting the engine…'
              : p.phase === 'download'
                ? opening.remote === 'GitLab'
                    ? `Downloaded ${p.current.toLocaleString()}${p.total ? ` of ${p.total.toLocaleString()}` : ''} KB from GitLab`
                    : `Downloaded ${p.current.toLocaleString()} of ${p.total.toLocaleString()} files from ${opening.remote ?? 'the repository'}`
              : p.phase === 'checking'
                ? `Checking ${p.current.toLocaleString()} of ${p.total.toLocaleString()} files`
                : p.phase === 'parsing'
                  ? `Parsed ${p.current.toLocaleString()} of ${p.total.toLocaleString()} files`
                  : 'Saving the index and building the map…';
    return (
        <div className="opening" role="status" aria-live="polite">
            <div className="opening-head">
                <span className="opening-icon">
                    <span className="spinner" aria-hidden />
                </span>
                <div>
                    <strong>Opening {opening.label}</strong>
                    <p className="muted">
                        {detail} · {seconds}s
                    </p>
                </div>
            </div>
            <div className={`bar${pct === undefined ? ' indeterminate' : ''}`} aria-hidden="true">
                <span style={pct === undefined ? undefined : { width: `${Math.max(3, pct)}%` }} />
            </div>
            <ol className="opening-steps">
                {STEPS.map((s, i) => (
                    <li key={s.id} className={i < step ? 'done' : i === step ? 'active' : ''}>
                        <span className="dot" aria-hidden="true">
                            {i < step ? <Icon name="check" size={11} /> : null}
                        </span>
                        <span>
                            {s.id === 'read' && opening.remote ? `Download from ${opening.remote}` : s.label}
                            {i === step && pct !== undefined ? <span className="muted"> · {pct}%</span> : null}
                            <span className="muted step-hint">{s.id === 'read' && opening.remote ? 'Only the code files, straight into this tab' : s.hint}</span>
                        </span>
                    </li>
                ))}
            </ol>
            <p className="muted small-print">{opening.remote ? `Downloaded from ${opening.remote} by this browser; nothing is uploaded.` : 'Everything happens in this browser: nothing is uploaded.'}</p>
        </div>
    );
}

export interface OpenActionsProps {
    onFolder(): void;
    onZip(): void;
    onSample(): void;
    /** Open a sample repository (owner/repo on GitHub). */
    onSampleRepo(repo: string): void;
    repoUrl: string;
    onRepoUrl(v: string): void;
    onRepo(): void;
    canWatch: boolean;
    pairLink: string;
    onPairLink(v: string): void;
    onPair(): void;
}

/** The ways in: a folder, a .zip, a sample repository, a repository URL, or the Companion. */
export function OpenActions(props: OpenActionsProps) {
    return (
        <>
            <div className="open-tiles">
                <button type="button" className="open-tile primary" onClick={props.onFolder}>
                    <Icon name="boxes" size={20} />
                    <strong>Open a folder</strong>
                    <span>{props.canWatch ? 'Stays live: edits on disk show up on the Map' : 'Read once in this browser'}</span>
                </button>
                <button type="button" className="open-tile" onClick={props.onZip}>
                    <Icon name="download" size={20} />
                    <strong>Open a .zip</strong>
                    <span>A GitHub download works as it is</span>
                </button>
            </div>
            <p className="muted drop-note">…or drop a folder or a .zip anywhere on this page.</p>
            <Samples onOpen={props.onSampleRepo} onOffline={props.onSample} />
            <form
                className="pair repo"
                aria-label="Open a public repository"
                onSubmit={(e) => {
                    e.preventDefault();
                    props.onRepo();
                }}
            >
                <Icon name="globe" size={16} />
                <input aria-label="Public repository URL" placeholder="Public repository: https://github.com/owner/repo or gitlab.com/group/project" value={props.repoUrl} onChange={(e) => props.onRepoUrl(e.target.value)} />
                <button type="submit" disabled={!props.repoUrl.trim()}>
                    Open
                </button>
            </form>
            <section className="companion" aria-label="Connect to the Companion">
                <h2>Big repository? Connect to the Companion</h2>
                <p className="muted">
                    In your repository, run the{' '}
                    <a href="https://github.com/CodeArchy/codearchy/blob/main/docs/guides/companion.md" rel="noopener noreferrer">
                        CodeArchy CLI
                    </a>{' '}
                    (Node.js 22 or later) and open the link it prints. The engine then runs natively on this machine (live updates in any browser, no size limit, authorship from git), and this page talks to
                    it directly. Only this machine can connect.
                </p>
                <CopyCommand command="npx codearchy serve --root ." />
                <form
                    className="pair"
                    onSubmit={(e) => {
                        e.preventDefault();
                        props.onPair();
                    }}
                >
                    <input aria-label="Companion link" placeholder="…or paste the link here" value={props.pairLink} onChange={(e) => props.onPairLink(e.target.value)} />
                    <button type="submit" disabled={!props.pairLink.trim()}>
                        Connect
                    </button>
                </form>
            </section>
        </>
    );
}

type Sample = (typeof SAMPLES.samples)[number];

/** A sample's logo (Simple Icons, one path), drawn in the card's --brand colour (the text colour for black logos). */
function SampleLogo({ sample }: { sample: Sample }) {
    return (
        <span className="sample-logo" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="20" height="20" focusable="false">
                <path d={sample.logo.path} fill="currentColor" />
            </svg>
        </span>
    );
}

/** Well-known open-source repositories, one click from their architecture; and the offline sample. */
function Samples({ onOpen, onOffline }: { onOpen(repo: string): void; onOffline(): void }) {
    const [all, setAll] = useState(false);
    const shown = all ? SAMPLES.samples : SAMPLES.samples.filter((s) => s.featured);
    return (
        <section className="samples" aria-labelledby="samples-title">
            <div className="samples-head">
                <h2 id="samples-title">Try a sample</h2>
                <span className="muted">Famous open-source projects, downloaded from GitHub into this tab</span>
            </div>
            <ul className="sample-grid">
                {shown.map((s) => (
                    <li key={s.repo}>
                        <button
                            type="button"
                            className="sample"
                            style={s.logo.color ? ({ '--brand': s.logo.color } as CSSProperties) : undefined}
                            onClick={() => onOpen(s.repo)}
                            title={`${s.repo}: ${s.blurb}. About ${s.seconds} s to map.`}
                            aria-label={`Open ${s.name} (${s.repo}): ${s.language}, ${s.files.toLocaleString('en')} files`}
                        >
                            <SampleLogo sample={s} />
                            <span className="sample-text">
                                <strong>{s.name}</strong>
                                <span>
                                    {s.language}
                                    <span className="sample-files"> · {s.files.toLocaleString('en')} files</span>
                                </span>
                            </span>
                        </button>
                    </li>
                ))}
            </ul>
            <p className="samples-foot muted">
                <button type="button" className="link" onClick={() => setAll((v) => !v)} aria-expanded={all}>
                    {all ? 'Show fewer' : `Show all ${SAMPLES.samples.length}`}
                </button>
                <span aria-hidden="true"> · </span>
                <button type="button" className="link" onClick={onOffline}>
                    Offline sample
                </button>{' '}
                (a small polyglot repository, no download)
            </p>
        </section>
    );
}

/** A command to paste into a terminal, with a Copy button. */
function CopyCommand({ command }: { command: string }) {
    const [copied, setCopied] = useState(false);
    const copy = () =>
        void navigator.clipboard?.writeText(command).then(
            () => {
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
            },
            () => undefined
        );
    return (
        <div className="copy-command">
            <code>{command}</code>
            <button type="button" onClick={copy} aria-label={`Copy: ${command}`}>
                {copied ? 'Copied' : 'Copy'}
            </button>
        </div>
    );
}
