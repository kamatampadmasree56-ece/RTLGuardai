import React, { useEffect, useRef, useState } from 'https://esm.sh/react@18.2.0';

export default function CodeEditor({ value, onChange, issues = [], onLineClick, readOnly = false }) {
    const editorRef = useRef(null);
    const containerRef = useRef(null);
    const [monacoLoaded, setMonacoLoaded] = useState(false);

    // Load Monaco via AMD loader
    useEffect(() => {
        if (window.monaco) {
            setMonacoLoaded(true);
            return;
        }

        // Wait for Monaco loader script to resolve and configure
        const interval = setInterval(() => {
            if (window.require) {
                clearInterval(interval);
                window.require.config({ 
                    paths: { vs: 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.39.0/min/vs' } 
                });
                window.require(['vs/editor/editor.main'], () => {
                    setMonacoLoaded(true);
                });
            }
        }, 100);

        return () => clearInterval(interval);
    }, []);

    // Instantiate and manage editor
    useEffect(() => {
        if (!monacoLoaded || !containerRef.current) return;

        // Create the editor instance
        const editor = window.monaco.editor.create(containerRef.current, {
            value: value || '',
            language: 'verilog',
            theme: 'vs-dark',
            automaticLayout: true,
            fontSize: 14,
            fontFamily: "'JetBrains Mono', monospace",
            minimap: { enabled: true },
            lineNumbers: 'on',
            roundedSelection: false,
            scrollBeyondLastLine: false,
            readOnly: readOnly,
            cursorBlinking: 'smooth',
            cursorSmoothCaretAnimation: 'on',
            padding: { top: 16, bottom: 16 },
            glyphMargin: true, // Enable glyph margin for severity icons
            colors: {
                'editor.background': '#070a13',
            }
        });

        editorRef.current = editor;

        // Listen for line clicks
        editor.onMouseDown((e) => {
            if (e.target && e.target.position && onLineClick) {
                onLineClick(e.target.position.lineNumber);
            }
        });

        // Listen for value changes
        const changeListener = editor.onDidChangeModelContent(() => {
            const val = editor.getValue();
            if (onChange) onChange(val);
        });

        // Set custom styling overrides
        window.monaco.editor.defineTheme('custom-dark', {
            base: 'vs-dark',
            inherit: true,
            rules: [
                { token: 'keyword', foreground: '00f2fe', fontStyle: 'bold' },
                { token: 'comment', foreground: '6b7280' },
                { token: 'number', foreground: 'e100ff' },
                { token: 'string', foreground: '4facfe' }
            ],
            colors: {
                'editor.background': '#070a13',
                'editor.lineHighlightBackground': '#1f293750',
                'editorGutter.background': '#030712'
            }
        });
        window.monaco.editor.setTheme('custom-dark');

        return () => {
            changeListener.dispose();
            editor.dispose();
            editorRef.current = null;
        };
    }, [monacoLoaded]);

    // Handle updates to readOnly options dynamically
    useEffect(() => {
        if (!editorRef.current) return;
        editorRef.current.updateOptions({ readOnly: readOnly });
    }, [readOnly]);

    // Handle updates to value from external state (e.g. file selection)
    useEffect(() => {
        if (!editorRef.current) return;
        const currentVal = editorRef.current.getValue();
        if (value !== currentVal) {
            editorRef.current.setValue(value || '');
        }
    }, [value]);

    const decorationsRef = useRef([]);

    // Apply issues markers (squiggly underlines) and gutter decorations to editor lines
    useEffect(() => {
        if (!editorRef.current || !monacoLoaded) return;

        const model = editorRef.current.getModel();
        if (!model) return;

        // 1. Set squiggly underlines
        const markers = issues.map(issue => {
            let severity = window.monaco.MarkerSeverity.Info;
            if (issue.severity === 'error') severity = window.monaco.MarkerSeverity.Error;
            if (issue.severity === 'warning') severity = window.monaco.MarkerSeverity.Warning;

            return {
                startLineNumber: issue.lineNum,
                startColumn: 1,
                endLineNumber: issue.lineNum,
                endColumn: model.getLineMaxColumn(issue.lineNum),
                message: `${issue.message}\n💡 Rec: ${issue.recommendation}`,
                severity: severity
            };
        });

        window.monaco.editor.setModelMarkers(model, 'rtlguard_static_audit', markers);

        // 2. Set line highlight and glyph margin decorations
        const newDecorations = issues.map(issue => {
            let className = 'info-line-decoration';
            let glyphMarginClassName = 'info-glyph-margin';
            if (issue.severity === 'error') {
                className = 'error-line-decoration';
                glyphMarginClassName = 'error-glyph-margin';
            } else if (issue.severity === 'warning') {
                className = 'warning-line-decoration';
                glyphMarginClassName = 'warning-glyph-margin';
            }

            return {
                range: new window.monaco.Range(issue.lineNum, 1, issue.lineNum, 1),
                options: {
                    isWholeLine: true,
                    className: className,
                    glyphMarginClassName: glyphMarginClassName,
                    glyphMarginHoverMessage: { value: issue.message }
                }
            };
        });

        decorationsRef.current = editorRef.current.deltaDecorations(decorationsRef.current, newDecorations);
    }, [issues, monacoLoaded, value]); // Re-run when issues or value updates

    return React.createElement(
        'div',
        { className: 'w-full h-full relative rounded-xl border border-white/5 overflow-hidden flex flex-col' },
        !monacoLoaded && React.createElement(
            'div',
            { className: 'absolute inset-0 flex flex-col items-center justify-center bg-[#070a13] text-gray-400 gap-4' },
            React.createElement('div', { className: 'w-8 h-8 rounded-full border-2 border-cyber-teal border-t-transparent animate-spin' }),
            React.createElement('span', { className: 'text-xs font-semibold tracking-wider animate-pulse text-cyber-teal' }, 'BOOTING HARDWARE CODE EDITOR...')
        ),
        React.createElement('div', { 
            ref: containerRef, 
            className: 'w-full h-full flex-1'
        })
    );
}
