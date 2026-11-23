/**
 * The web app's code viewer (the HostPort "open file" of the browser): a
 * read-only CodeMirror 6 view of a workspace file, scrolled to a line.
 */
import { useEffect, useRef } from 'react';
import { EditorState, type Extension } from '@codemirror/state';
import { EditorView, highlightActiveLine, highlightActiveLineGutter, lineNumbers } from '@codemirror/view';
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

export interface CodeViewerProps {
    path: string;
    text: string;
    /** 0-based line to reveal. */
    line?: number;
    dark: boolean;
    onClose(): void;
}

export function CodeViewer({ path, text, line, dark, onClose }: CodeViewerProps) {
    const host = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const target = Math.min(Math.max(1, (line ?? 0) + 1), Math.max(1, text.split('\n').length));
        const state = EditorState.create({
            doc: text,
            extensions: [
                EditorState.readOnly.of(true),
                EditorView.editable.of(false),
                lineNumbers(),
                highlightActiveLine(),
                highlightActiveLineGutter(),
                syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
                languageFor(path),
                ...(dark ? [oneDark] : []),
                EditorView.theme({ '&': { height: '100%' }, '.cm-scroller': { fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' } }),
            ],
        });
        const view = new EditorView({ state, parent: host.current! });
        const pos = view.state.doc.line(target).from;
        view.dispatch({ selection: { anchor: pos }, effects: EditorView.scrollIntoView(pos, { y: 'center' }) });
        return () => view.destroy();
    }, [path, text, line, dark]);

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
            <div className="viewer-body" ref={host} />
        </aside>
    );
}
