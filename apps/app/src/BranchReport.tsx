/**
 * The branch authorship report (through the Companion): what the current
 * branch adds since it left its base, by who wrote it, per part, and the new
 * dependencies between parts. Shown as Markdown, ready for a pull request.
 */
import { useEffect, useRef, useState } from 'react';
import type { CompanionEngine } from '@codearchy/platform-browser/companion';

export function BranchReportDialog({ engine, onClose }: { engine: CompanionEngine; onClose(): void }) {
    const [base, setBase] = useState('');
    const [markdown, setMarkdown] = useState<string>();
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);
    const [copied, setCopied] = useState(false);
    const field = useRef<HTMLInputElement>(null);
    useEffect(() => field.current?.focus(), []);

    const run = async () => {
        setBusy(true);
        setError('');
        setCopied(false);
        try {
            const { markdown: md } = await engine.authorshipReport(base.trim() || undefined);
            setMarkdown(md);
        } catch (err) {
            setError(err instanceof Error ? err.message : String(err));
        } finally {
            setBusy(false);
        }
    };
    const copy = async () => {
        if (!markdown) return;
        try {
            await navigator.clipboard.writeText(markdown);
            setCopied(true);
        } catch {
            setError("Couldn't copy: select the text and copy it instead.");
        }
    };

    return (
        <div className="report-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()} onKeyDown={(e) => e.key === 'Escape' && onClose()}>
            <section className="report" role="dialog" aria-modal="true" aria-label="Branch authorship report">
                <header>
                    <h2>Branch authorship report</h2>
                    <button type="button" className="link" onClick={onClose} aria-label="Close the report">
                        ✕
                    </button>
                </header>
                <p className="muted">What this branch adds since it left its base: lines by who wrote them, per part, and the new dependencies between parts.</p>
                <form
                    className="report-form"
                    onSubmit={(e) => {
                        e.preventDefault();
                        void run();
                    }}
                >
                    <input ref={field} aria-label="Compare with" placeholder="Compare with… (empty: the main branch)" value={base} onChange={(e) => setBase(e.target.value)} />
                    <button type="submit" disabled={busy}>
                        {busy ? 'Reading the branch…' : 'Generate'}
                    </button>
                    {markdown ? (
                        <button type="button" onClick={() => void copy()}>
                            {copied ? 'Copied' : 'Copy Markdown'}
                        </button>
                    ) : null}
                </form>
                {error ? (
                    <p className="error" role="alert">
                        {error}
                    </p>
                ) : null}
                {markdown ? <pre className="report-markdown" aria-label="Report (Markdown)">{markdown}</pre> : null}
            </section>
        </div>
    );
}
