import React from 'https://esm.sh/react@18.2.0';

/**
 * DiffViewer — Side-by-side RTL original vs fixed diff
 * Props: original (string), fixed (string)
 */
export default function DiffViewer({ original = '', fixed = '' }) {
    const origLines = original.split('\n');
    const fixLines  = fixed.split('\n');

    const maxLines = Math.max(origLines.length, fixLines.length);

    function classifyLine(origLine, fixLine) {
        if (origLine === fixLine) return 'neutral';
        if (!origLine) return 'added';
        if (!fixLine)  return 'removed';
        // Changed line — shown as removed in left, added in right
        return 'changed';
    }

    const LineNumber = ({ n, color }) =>
        React.createElement('span', {
            className: 'select-none w-10 inline-block text-right pr-3 flex-shrink-0 font-mono text-[10px] opacity-40',
            style: { color }
        }, n || '');

    const PanelHeader = ({ title, count, color }) =>
        React.createElement('div', {
            className: 'flex items-center justify-between px-4 py-2 border-b border-white/5 bg-black/30 flex-shrink-0'
        },
            React.createElement('span', { className: 'text-xs font-bold text-gray-400 font-mono' }, title),
            React.createElement('span', {
                className: 'text-[10px] font-semibold px-2 py-0.5 rounded-full',
                style: { background: `${color}20`, color }
            }, `${count} lines`)
        );

    return React.createElement(
        'div',
        { className: 'grid grid-cols-2 gap-1 h-full min-h-[400px] rounded-xl overflow-hidden border border-white/5' },

        // LEFT — Original
        React.createElement(
            'div',
            { className: 'flex flex-col bg-[#070a13] overflow-hidden' },
            React.createElement(PanelHeader, { title: 'Original RTL', count: origLines.length, color: '#ef4444' }),
            React.createElement(
                'div',
                { className: 'flex-1 overflow-auto p-0' },
                React.createElement(
                    'pre',
                    { className: 'text-[11px] font-mono leading-relaxed m-0 p-0' },
                    Array.from({ length: maxLines }).map((_, i) => {
                        const oLine = origLines[i] ?? '';
                        const fLine = fixLines[i] ?? '';
                        const cls = classifyLine(oLine, fLine);
                        const isChanged = cls === 'changed' || cls === 'removed';
                        return React.createElement(
                            'div',
                            {
                                key: i,
                                className: `flex items-start px-2 py-0.5 ${isChanged ? 'diff-removed' : 'diff-neutral'}`
                            },
                            React.createElement(LineNumber, { n: i + 1, color: '#9ca3af' }),
                            React.createElement('span', {
                                className: `flex-1 ${isChanged ? 'text-red-300' : 'text-gray-300'}`
                            }, oLine || '\u00A0')
                        );
                    })
                )
            )
        ),

        // RIGHT — Fixed
        React.createElement(
            'div',
            { className: 'flex flex-col bg-[#070a13] overflow-hidden border-l border-white/5' },
            React.createElement(PanelHeader, { title: '✅ Auto-Fixed RTL', count: fixLines.length, color: '#00ff88' }),
            React.createElement(
                'div',
                { className: 'flex-1 overflow-auto p-0' },
                React.createElement(
                    'pre',
                    { className: 'text-[11px] font-mono leading-relaxed m-0 p-0' },
                    Array.from({ length: maxLines }).map((_, i) => {
                        const oLine = origLines[i] ?? '';
                        const fLine = fixLines[i] ?? '';
                        const cls = classifyLine(oLine, fLine);
                        const isAdded = cls === 'changed' || cls === 'added';
                        return React.createElement(
                            'div',
                            {
                                key: i,
                                className: `flex items-start px-2 py-0.5 ${isAdded ? 'diff-added' : 'diff-neutral'}`
                            },
                            React.createElement(LineNumber, { n: i + 1, color: '#9ca3af' }),
                            React.createElement('span', {
                                className: `flex-1 ${isAdded ? 'text-green-300' : 'text-gray-300'}`
                            }, fLine || '\u00A0')
                        );
                    })
                )
            )
        )
    );
}
