/**
 * The web app's code viewer (the HostPort "open file" of the browser): a
 * read-only CodeMirror 6 view of a workspace file, scrolled to a line.
 *
 * With the Companion it also shows authorship: a thin bar beside AI-written
 * (orange) and reviewed (blue) lines, and "Mark as reviewed" / "Correct" for
 * the selected lines, kept in the Companion's ledger (never in the files).
 */
import { useEffect, useRef, useState } from 'react';
import { Compartment, EditorState, RangeSet, type Extension } from '@codemirror/state';
import { EditorView, GutterMarker, gutter, highlightActiveLine, highlightActiveLineGutter, lineNumbers } from '@codemirror/view';
import { agentName, type AuthorshipOrigin, type AuthorshipRange } from '@codearchy/protocol';
import { StreamLanguage, defaultHighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { javascript } from '@codemirror/lang-javascript';
import { python } from '@codemirror/lang-python';
import { java } from '@codemirror/lang-java';
import { rust } from '@codemirror/lang-rust';
import { php } from '@codemirror/lang-php';
import { go } from '@codemirror/lang-go';
import { csharp, kotlin } from '@codemirror/legacy-modes/mode/clike';
import { ruby } from '@codemirror/legacy-modes/mode/ruby';
import { oneDark } from '@codemirror/theme-one-dark';

function languageFor(path: string): Extension {
    const ext = path.slice(path.lastIndexOf('.') + 1).toLowerCase();
    switch (ext) {
        case 'ts':
        case 'mts':
        case 'cts':
            return javascript({ typescript: true });
        case 'tsx':
            return javascript({ typescript: true, jsx: true });
        case 'jsx':
            return javascript({ jsx: true });
        case 'js':
        case 'mjs':
        case 'cjs':
            return javascript();
        case 'py':
        case 'pyi':
            return python();
        case 'java':
            return java();
        case 'rs':
            return rust();
        case 'php':
            return php();
        case 'go':
            return go();
        case 'kt':
        case 'kts':
            return StreamLanguage.define(kotlin);
        case 'cs':
            return StreamLanguage.define(csharp);
        case 'rb':
        case 'rake':
        case 'gemspec':
            return StreamLanguage.define(ruby);
        default:
            return [];
    }
}

/** A thin coloured bar in the authorship gutter; its title is the hover. */
class AuthorshipMarker extends GutterMarker {
    constructor(
        readonly origin: 'ai' | 'reviewed',
        readonly title: string
    ) {
        super();
    }
    eq(other: AuthorshipMarker): boolean {
        return other.origin === this.origin && other.title === this.title;
    }
    toDOM(): Node {
        const el = document.createElement('span');
        el.className = `cm-authorship-${this.origin}`;
        el.title = this.title;
        return el;
    }
}

function describe(r: AuthorshipRange): string {
    const who = agentName(r.agent ?? 'unknown-ai');
    const evidence = r.commit ? `from commit ${r.commit.slice(0, 7)}` : r.confidence === 'declared' ? 'recorded by a person' : 'captured in an editor (inferred)';
    return `${who} · ${evidence} · ${r.origin === 'reviewed' ? 'changed or reviewed by a person since' : 'not changed since'}`;
}

/** The gutter for a file's attributed ranges (only AI and reviewed lines are marked). */
function authorshipGutter(ranges: AuthorshipRange[]): Extension {
    return gutter({
        class: 'cm-authorship-gutter',
        markers: (view) => {
            const marks = [];
            const lines = view.state.doc.lines;
            for (const r of ranges) {
                if (r.origin !== 'ai' && r.origin !== 'reviewed') continue;
                const marker = new AuthorshipMarker(r.origin, describe(r));
                for (let n = Math.max(1, r.start); n <= Math.min(r.end, lines); n++) marks.push(marker.range(view.state.doc.line(n).from));
            }
            return RangeSet.of(marks, true);
        },
    });
}

export interface ViewerAuthorship {
    /** The file's attributed ranges (from the engine's authorship of `mod:<path>`). */
    ranges: AuthorshipRange[];
    /** Marks lines (1-based, inclusive) as reviewed, or corrects them; resolves when the ledger has them. */
    mark(start: number, end: number, as: 'reviewed' | AuthorshipOrigin): Promise<{ marked: number }>;
}

export interface CodeViewerProps {
    path: string;
    text: string;
    /** 0-based line to reveal. */
    line?: number;
    dark: boolean;
    onClose(): void;
    /** With the Companion: authorship in the gutter, and review/correct actions. */
    authorship?: ViewerAuthorship;
}

export function CodeViewer({ path, text, line, dark, onClose, authorship }: CodeViewerProps) {
    const host = useRef<HTMLDivElement>(null);
    /** The selected lines (1-based), for the authorship actions. */
    const [selected, setSelected] = useState<{ start: number; end: number }>();
    const [note, setNote] = useState('');
    const ranges = authorship?.ranges;
    /** The gutter is reconfigured in place when authorship changes, so the view (and the selection) survive. */
    const gutterSlot = useRef(new Compartment());
    const view = useRef<EditorView>();
    useEffect(() => {
        const target = Math.min(Math.max(1, (line ?? 0) + 1), Math.max(1, text.split('\n').length));
        const state = EditorState.create({
            doc: text,
            extensions: [
                // Read-only, but selectable (the authorship actions work on the selected lines).
                EditorState.readOnly.of(true),
                gutterSlot.current.of(ranges ? authorshipGutter(ranges) : []),
                lineNumbers(),
                highlightActiveLine(),
                highlightActiveLineGutter(),
                syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
                languageFor(path),
                ...(dark ? [oneDark] : []),
                EditorView.theme({ '&': { height: '100%' }, '.cm-scroller': { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' } }),
                EditorView.updateListener.of((u) => {
                    if (!u.selectionSet) return;
                    const sel = u.state.selection.main;
                    const a = u.state.doc.lineAt(sel.from).number;
                    const b = u.state.doc.lineAt(sel.to).number;
                    setSelected({ start: a, end: sel.to > sel.from && u.state.doc.lineAt(sel.to).from === sel.to && b > a ? b - 1 : b });
                }),
            ],
        });
        const v = new EditorView({ state, parent: host.current! });
        view.current = v;
        const pos = v.state.doc.line(target).from;
        v.dispatch({ selection: { anchor: pos }, effects: EditorView.scrollIntoView(pos, { y: 'center' }) });
        return () => {
            view.current = undefined;
            v.destroy();
        };
    }, [path, text, line, dark]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        view.current?.dispatch({ effects: gutterSlot.current.reconfigure(ranges ? authorshipGutter(ranges) : []) });
    }, [ranges]);

    const counts = { ai: 0, reviewed: 0 };
    for (const r of ranges ?? []) if (r.origin === 'ai' || r.origin === 'reviewed') counts[r.origin] += r.end - r.start + 1;
    const act = async (as: 'reviewed' | AuthorshipOrigin) => {
        if (!authorship || !selected) return;
        const { marked } = await authorship.mark(selected.start, selected.end, as);
        setNote(as === 'reviewed' ? (marked ? `Marked ${marked} line${marked === 1 ? '' : 's'} as reviewed` : 'No AI-written lines selected') : 'Authorship corrected');
    };

    return (
        <aside className="viewer" aria-label={`Code: ${path}`}>
            <header>
                <span className="viewer-path" title={path}>
                    {path}
                    {line !== undefined ? `:${line + 1}` : ''}
                </span>
                <button type="button" onClick={onClose} aria-label="Close the code viewer">
                    ✕
                </button>
            </header>
            {authorship ? (
                <div className="viewer-authorship" role="toolbar" aria-label="Authorship">
                    <span className="legend">
                        <span className="sw sw-ai" aria-hidden="true" /> AI {counts.ai.toLocaleString()} · <span className="sw sw-reviewed" aria-hidden="true" /> reviewed {counts.reviewed.toLocaleString()} lines
                    </span>
                    <span className="sel">{selected ? `Lines ${selected.start}${selected.end > selected.start ? `–${selected.end}` : ''}` : 'Select lines'}</span>
                    <button type="button" disabled={!selected} onClick={() => void act('reviewed')}>
                        Mark as reviewed
                    </button>
                    <select
                        aria-label="Correct authorship of the selected lines"
                        disabled={!selected}
                        value=""
                        onChange={(e) => {
                            const v = e.target.value as AuthorshipOrigin;
                            e.target.value = '';
                            if (v) void act(v);
                        }}
                    >
                        <option value="">Correct…</option>
                        <option value="human">Written by a person</option>
                        <option value="ai">Written by an AI tool</option>
                        <option value="unknown">Unknown (forget)</option>
                    </select>
                    {note ? <span className="note" role="status">{note}</span> : null}
                </div>
            ) : null}
            <div className="viewer-body" ref={host} />
        </aside>
    );
}
