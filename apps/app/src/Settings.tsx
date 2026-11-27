/**
 * Settings (the gear after Voice): what this browser stores and how much, the
 * optional limit on it, the export folder on this device, and how to open the
 * codebase in another browser. AI and Voice keep their own panels.
 *
 * What's stored is the index CodeArchy built (files, symbols, dependencies),
 * never the source code, and the dialog says so first.
 */
import { useEffect, useState } from 'react';
import { Icon } from '@codearchy/ui';
import type { WorkspaceSummary } from '@codearchy/protocol';
import type { CompanionEngine } from '@codearchy/platform-browser/companion';
import { STORAGE_LIMIT_RANGE, allowExportFolder, canPickDirectory, pickExportFolder, type StorageStatus, type StoredIndex, type WorkerEngine } from '@codearchy/platform-browser/client';
import { CopyCommand } from './chrome';

interface SettingsProps {
    engine: WorkerEngine;
    /** Set while connected to `codearchy serve`. */
    companion?: { engine: CompanionEngine; version: string };
    summary?: WorkspaceSummary;
    onClose(): void;
}

const SOURCE_LABEL: Record<NonNullable<StoredIndex['source']>, string> = { folder: 'Folder', files: 'Folder (files)', zip: '.zip', sample: 'Sample', repository: 'Repository' };

export function SettingsDialog({ engine, companion, summary, onClose }: SettingsProps) {
    const [status, setStatus] = useState<StorageStatus>();
    const [error, setError] = useState<string>();
    const [note, setNote] = useState<string>();
    const [busy, setBusy] = useState(false);
    const [maxMB, setMaxMB] = useState('');
    const [confirmDelete, setConfirmDelete] = useState<string>();

    const refresh = async () => {
        try {
            const s = await engine.storage();
            setStatus(s);
            setMaxMB(String(s.settings.limit.maxMB));
        } catch (err) {
            setError((err as Error).message);
        }
    };
    useEffect(() => void refresh(), []); // eslint-disable-line react-hooks/exhaustive-deps

    /** Runs one action, then shows the new state. */
    const act = async (fn: () => Promise<string | void>) => {
        setBusy(true);
        setError(undefined);
        setNote(undefined);
        try {
            const message = await fn();
            if (message) setNote(message);
        } catch (err) {
            setError((err as Error).message.split('\n')[0]);
        } finally {
            setBusy(false);
            await refresh();
        }
    };
    const removedNote = (removed: string[]) => (removed.length ? `Removed the index of ${list(removed)} to stay under the limit.` : undefined);

    const limit = status?.settings.limit;
    const setLimit = (enabled: boolean, mb: number) =>
        act(async () => removedNote(await engine.setStorageSettings({ limit: { enabled, maxMB: mb } })));
    const typedMB = Number(maxMB);
    const typedOk = Number.isFinite(typedMB) && typedMB >= STORAGE_LIMIT_RANGE.min && typedMB <= STORAGE_LIMIT_RANGE.max;

    const folder = status?.exportFolder;
    const canExport = !!status?.canExport && canPickDirectory();
    const chooseFolder = () =>
        act(async () => {
            const handle = await pickExportFolder();
            if (!handle) return;
            await engine.setExportFolder(handle);
            return `Exporting to “${handle.name}”.`;
        });

    const current = status?.indexes.find((i) => i.db === status.current);

    return (
        <div className="open-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()} onKeyDown={(e) => e.key === 'Escape' && onClose()}>
            <div className="open-dialog settings-dialog" role="dialog" aria-modal="true" aria-label="Settings">
                <header>
                    <h2>Settings</h2>
                    <span className="muted">Storage on this device, and opening a codebase in another browser.</span>
                    <button type="button" className="icon" aria-label="Close" title="Close" onClick={onClose}>
                        <Icon name="close" size={16} />
                    </button>
                </header>

                <p className="settings-callout">
                    <Icon name="info" size={15} />
                    <span>
                        <strong>CodeArchy stores an index, not your code.</strong> For each codebase it keeps what it worked out (the files, symbols and dependencies), so the codebase opens fast next time. Your source code isn’t copied into the browser: a folder is read where it
                        is, and a downloaded repository is kept in memory only while it’s open.
                    </span>
                </p>

                {error ? (
                    <p className="error" role="alert">
                        {error}
                    </p>
                ) : null}
                {note ? (
                    <p className="settings-note" role="status">
                        {note}
                    </p>
                ) : null}

                {/* ── storage ─────────────────────────────────────────── */}
                <section className="settings-section" aria-labelledby="settings-storage">
                    <h3 id="settings-storage">Stored indexes</h3>
                    {!status ? (
                        <p className="muted">Reading…</p>
                    ) : (
                        <>
                            <p className="settings-stats">
                                <span>
                                    <strong>{bytes(status.totalBytes)}</strong> in {status.indexes.length} {status.indexes.length === 1 ? 'index' : 'indexes'}
                                </span>
                                {status.origin ? (
                                    <span className="muted" title="Everything this site keeps in the browser: the indexes, the voice model and the app’s own files">
                                        This site uses {bytes(status.origin.usage)} of the {bytes(status.origin.quota)} the browser allows
                                    </span>
                                ) : null}
                            </p>
                            {!status.persistent ? <p className="settings-warning">{status.reason ?? 'Indexes can’t be kept in this browser: they last only while the tab is open.'}</p> : null}
                            {status.indexes.length ? (
                                <ul className="settings-indexes">
                                    {status.indexes.map((i) => {
                                        const open = i.db === status.current;
                                        return (
                                            <li key={i.db}>
                                                <span className="settings-index-name" title={i.url ?? i.name}>
                                                    {i.name}
                                                    {open ? <span className="settings-badge">open</span> : null}
                                                </span>
                                                <span className="muted">
                                                    {[i.source ? SOURCE_LABEL[i.source] : undefined, i.files !== undefined ? `${i.files.toLocaleString()} files` : undefined, bytes(i.sizeBytes), i.openedAt ? `opened ${ago(i.openedAt)}` : undefined]
                                                        .filter(Boolean)
                                                        .join(' · ')}
                                                </span>
                                                <button
                                                    type="button"
                                                    className={`settings-small${confirmDelete === i.db ? ' danger' : ''}`}
                                                    disabled={open || busy}
                                                    title={open ? 'Open another codebase first' : 'Delete this index from this browser (an exported copy stays)'}
                                                    onClick={() => {
                                                        if (confirmDelete !== i.db) return setConfirmDelete(i.db);
                                                        setConfirmDelete(undefined);
                                                        void act(async () => {
                                                            await engine.deleteIndex(i.db);
                                                            return `Deleted the index of ${i.name}. It’s rebuilt the next time you open it.`;
                                                        });
                                                    }}
                                                    onBlur={() => confirmDelete === i.db && setConfirmDelete(undefined)}
                                                >
                                                    <Icon name="trash" size={13} /> {confirmDelete === i.db ? 'Delete?' : 'Delete'}
                                                </button>
                                            </li>
                                        );
                                    })}
                                </ul>
                            ) : (
                                <p className="muted">No indexes yet.</p>
                            )}
                        </>
                    )}
                </section>

                {/* ── limit ───────────────────────────────────────────── */}
                <section className="settings-section" aria-labelledby="settings-limit">
                    <h3 id="settings-limit">Limit</h3>
                    <label className="settings-check">
                        <input type="checkbox" checked={!!limit?.enabled} disabled={!status || busy} onChange={(e) => typedOk && void setLimit(e.target.checked, typedMB)} />
                        <span>Remove old indexes when they take more than</span>
                        <input
                            type="number"
                            className="settings-mb"
                            min={STORAGE_LIMIT_RANGE.min}
                            max={STORAGE_LIMIT_RANGE.max}
                            step={50}
                            value={maxMB}
                            disabled={!status || busy}
                            aria-label="Maximum, in MB"
                            aria-invalid={!typedOk}
                            onChange={(e) => setMaxMB(e.target.value)}
                            onBlur={() => limit && typedOk && typedMB !== limit.maxMB && void setLimit(limit.enabled, typedMB)}
                            onKeyDown={(e) => e.key === 'Enter' && limit && typedOk && void setLimit(limit.enabled, typedMB)}
                        />
                        <span>MB</span>
                    </label>
                    <p className="muted settings-help">
                        Off by default: nothing is removed unless you turn this on. When it’s on, the indexes you opened longest ago go first, and the open codebase never does. A removed index is rebuilt when you open that codebase again.
                        {!typedOk ? ` Enter ${STORAGE_LIMIT_RANGE.min.toLocaleString()} to ${STORAGE_LIMIT_RANGE.max.toLocaleString()} MB.` : ''}
                    </p>
                </section>

                {/* ── export folder ───────────────────────────────────── */}
                <section className="settings-section" aria-labelledby="settings-export">
                    <h3 id="settings-export">Export folder</h3>
                    <p className="muted settings-help">
                        A folder on this device that gets a copy of each index when it’s built or changes. When a browser has no index for a codebase, it looks there first, so another browser (or this one after its storage is cleared) carries on without indexing again.
                    </p>
                    {!canExport ? (
                        <p className="muted">This needs Chrome, Edge or another Chromium browser: only they let a site write to a folder you choose.</p>
                    ) : folder ? (
                        <>
                            <p className="settings-folder">
                                <Icon name="file" size={14} /> <strong>{folder.name}</strong>
                                <span className="muted">
                                    {folder.permission === 'granted'
                                        ? `${folder.indexes} ${folder.indexes === 1 ? 'index' : 'indexes'} in the folder${folder.lastExportAt ? ` · last copied ${ago(folder.lastExportAt)}` : ''}`
                                        : 'needs your OK again'}
                                </span>
                            </p>
                            {folder.lastError && folder.permission === 'granted' ? <p className="settings-warning">{folder.lastError}</p> : null}
                            <div className="settings-actions">
                                {folder.permission !== 'granted' ? (
                                    <button type="button" className="primary" disabled={busy} onClick={() => void act(async () => ((await allowExportFolder(folder.handle)) ? void (await engine.exportIndexes()) : 'The browser didn’t allow it.'))}>
                                        Allow access
                                    </button>
                                ) : (
                                    <button type="button" disabled={busy || !status?.indexes.length} onClick={() => void act(async () => `Copied ${await engine.exportIndexes()} ${status?.indexes.length === 1 ? 'index' : 'indexes'}.`)}>
                                        <Icon name="download" size={13} /> Export now
                                    </button>
                                )}
                                <button type="button" disabled={busy} onClick={() => void chooseFolder()}>
                                    Change folder…
                                </button>
                                <button type="button" className="ghost" disabled={busy} onClick={() => void act(async () => (await engine.setExportFolder(undefined), 'Stopped exporting. The copies already in the folder stay there.'))}>
                                    Stop exporting
                                </button>
                            </div>
                        </>
                    ) : (
                        <div className="settings-actions">
                            <button type="button" className="primary" disabled={busy || !status?.persistent} onClick={() => void chooseFolder()}>
                                Choose a folder…
                            </button>
                        </div>
                    )}
                </section>

                {/* ── another browser ─────────────────────────────────── */}
                <section className="settings-section" aria-labelledby="settings-browser">
                    <h3 id="settings-browser">Open in another browser</h3>
                    <AnotherBrowser companion={companion} current={current} exportFolder={folder?.name} canExport={canExport} />
                </section>

                {/* ── details ─────────────────────────────────────────── */}
                {summary ? (
                    <section className="settings-section" aria-labelledby="settings-details">
                        <h3 id="settings-details">This codebase</h3>
                        <dl className="settings-details">
                            <dt>Name</dt>
                            <dd>{summary.name}</dd>
                            <dt>Indexed</dt>
                            <dd>
                                {summary.files.toLocaleString()} files, {summary.symbols.toLocaleString()} symbols, {summary.edges.toLocaleString()} dependencies
                            </dd>
                            {summary.storage !== 'native' ? (
                                <>
                                    <dt>Last index</dt>
                                    <dd>
                                        {(summary.durationMs / 1000).toFixed(1)} s, {summary.parsed.toLocaleString()} parsed and {summary.reused.toLocaleString()} reused, on {summary.workers} {summary.workers === 1 ? 'worker' : 'workers'}
                                    </dd>
                                </>
                            ) : null}
                            <dt>Index kept</dt>
                            <dd>{summary.storage === 'native' ? `by the Companion (codearchy ${companion?.version ?? ''}) on this computer, under ~/.codearchy` : summary.storage === 'opfs' ? 'in this browser’s storage' : 'in memory only, until this tab closes'}</dd>
                            <dt>Changes on disk</dt>
                            <dd>{summary.live ? 'picked up live' : 'not watched (reopen to update)'}</dd>
                        </dl>
                    </section>
                ) : null}
            </div>
        </div>
    );
}

function AnotherBrowser({ companion, current, exportFolder, canExport }: { companion?: SettingsProps['companion']; current?: StoredIndex; exportFolder?: string; canExport: boolean }) {
    const [link, setLink] = useState<{ url: string; until: number }>();
    const [error, setError] = useState<string>();
    if (companion) {
        const make = () =>
            void companion.engine.pairingLink().then(
                (l) => (setError(undefined), setLink({ url: l.url, until: Date.now() + l.expiresInMs })),
                (err: Error) => setError(/unknown request/i.test(err.message) ? 'This Companion is too old to make links: restart it with npx codearchy@latest serve.' : err.message)
            );
        return (
            <>
                <p className="muted settings-help">Any browser on this computer can connect to the same Companion. Make a link and open it there: it works once, within 10 minutes.</p>
                {link ? <CopyCommand command={link.url} /> : null}
                {error ? <p className="error">{error}</p> : null}
                <div className="settings-actions">
                    <button type="button" className="primary" onClick={make}>
                        {link ? 'Make another link' : 'Make a link'}
                    </button>
                </div>
            </>
        );
    }
    const shareable = current?.source === 'repository' && current.url ? `${location.origin}/?repo=${encodeURIComponent(current.url)}` : undefined;
    return (
        <>
            {shareable ? (
                <>
                    <p className="muted settings-help">This repository opens in any browser from this link{exportFolder ? ', and with the same export folder chosen there, it skips indexing what hasn’t changed' : ''}.</p>
                    <CopyCommand command={shareable} />
                </>
            ) : (
                <ol className="settings-steps">
                    {canExport ? (
                        <>
                            <li>{exportFolder ? `Indexes are exported to “${exportFolder}”.` : 'Choose an export folder above.'}</li>
                            <li>In the other browser, open CodeArchy, choose the same folder in Settings, then open the codebase: it carries on from this index.</li>
                        </>
                    ) : (
                        <li>Open CodeArchy in the other browser and open the codebase there. With Chrome or Edge, an export folder lets it reuse this index.</li>
                    )}
                </ol>
            )}
            <p className="muted settings-help">Or run the Companion in your repository. Any browser on this computer can open the link it prints, and the index stays on disk:</p>
            <CopyCommand command="npx codearchy serve --root ." />
        </>
    );
}

// ─── formatting ─────────────────────────────────────────────────────────────

function bytes(n: number): string {
    if (n < 1024) return `${n} B`;
    const units = ['KB', 'MB', 'GB', 'TB'];
    let v = n / 1024;
    let u = 0;
    while (v >= 1024 && u < units.length - 1) {
        v /= 1024;
        u++;
    }
    return `${v < 10 ? v.toFixed(1) : Math.round(v).toLocaleString()} ${units[u]}`;
}

function ago(t: number): string {
    const s = Math.max(0, (Date.now() - t) / 1000);
    if (s < 60) return 'just now';
    const [n, unit] = s < 3600 ? [s / 60, 'minute'] : s < 86400 ? [s / 3600, 'hour'] : [s / 86400, 'day'];
    const r = Math.floor(n);
    return `${r} ${unit}${r === 1 ? '' : 's'} ago`;
}

function list(names: string[]): string {
    return names.length <= 1 ? (names[0] ?? '') : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
}
