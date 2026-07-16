import React, { useState, useEffect } from 'https://esm.sh/react@18.2.0';
import { useAppState } from '../utils/appState.js';
import { apiGetHierarchy } from '../utils/api.js';
import GlassCard from '../components/GlassCard.js';
import { Share2, RefreshCw, AlertCircle, Cpu, ArrowRight, Layers, Zap, GitBranch } from 'https://esm.sh/lucide-react@0.344.0';

// ── Heatmap ────────────────────────────────────
function ErrorHeatmap({ code, issues }) {
    const lines = code ? code.split('\n') : [];
    const issueMap = {};
    (issues || []).forEach(iss => {
        if (iss.lineNum > 0) issueMap[iss.lineNum] = iss.severity;
    });

    const CHUNK = 8;
    const cols = 40;
    const cells = [];

    for (let i = 0; i < Math.min(lines.length, cols * CHUNK); i += CHUNK) {
        const blockLines = Array.from({ length: CHUNK }, (_, j) => i + j + 1);
        const hasError   = blockLines.some(l => issueMap[l] === 'error');
        const hasWarning = blockLines.some(l => issueMap[l] === 'warning');
        const hasInfo    = blockLines.some(l => issueMap[l] === 'info');
        const cls = hasError ? 'heatmap-error' : hasWarning ? 'heatmap-warning' : hasInfo ? 'heatmap-info' : 'heatmap-clean';
        cells.push({ start: i + 1, end: i + CHUNK, cls });
    }

    return React.createElement(
        'div',
        { className: 'space-y-3' },
        React.createElement('h3', { className: 'font-bold text-sm text-white flex items-center gap-2' },
            React.createElement(Zap, { className: 'w-4 h-4 text-amber-400' }),
            'Error Heatmap'
        ),
        React.createElement('p', { className: 'text-[11px] text-gray-500' }, 'Each cell = 8 lines. Hover to see line range.'),
        React.createElement(
            'div',
            { className: 'flex flex-wrap gap-1.5 mt-2' },
            cells.map((cell, i) =>
                React.createElement('div', {
                    key: i,
                    className: `heatmap-cell w-5 h-5 tooltip-wrap ${cell.cls}`,
                    title: `Lines ${cell.start}–${cell.end}`
                },
                    React.createElement('span', { className: 'tooltip-box' }, `L${cell.start}–${cell.end}`)
                )
            )
        ),
        React.createElement(
            'div',
            { className: 'flex items-center gap-4 mt-2 text-[10px] text-gray-500' },
            [
                { cls: 'heatmap-error',   label: 'Error' },
                { cls: 'heatmap-warning', label: 'Warning' },
                { cls: 'heatmap-info',    label: 'Info' },
                { cls: 'heatmap-clean',   label: 'Clean' },
            ].map(({ cls, label }) =>
                React.createElement('div', { key: label, className: 'flex items-center gap-1.5' },
                    React.createElement('div', { className: `heatmap-cell w-3 h-3 ${cls} pointer-events-none` }),
                    label
                )
            )
        )
    );
}

// ── Hierarchy Graph ────────────────────────────
function HierarchyGraph({ hierarchy }) {
    if (!hierarchy) return null;

    const { moduleName, ports, instances, states } = hierarchy;
    const inputs  = (ports || []).filter(p => p.direction === 'input');
    const outputs = (ports || []).filter(p => p.direction === 'output');

    const boxW = 180, boxH = 120;
    const svgW = 600, svgH = Math.max(240, (instances?.length || 0) * 100 + 160);
    const cx = svgW / 2;

    return React.createElement(
        'div',
        { className: 'overflow-x-auto' },
        React.createElement(
            'svg',
            { width: svgW, height: svgH, viewBox: `0 0 ${svgW} ${svgH}`, className: 'max-w-full' },
            // Arrow marker
            React.createElement('defs', null,
                React.createElement('marker', { id: 'arrowViz', markerWidth: 8, markerHeight: 6, refX: 8, refY: 3, orient: 'auto' },
                    React.createElement('polygon', { points: '0 0, 8 3, 0 6', fill: 'rgba(0,242,254,0.5)' })
                )
            ),

            // Input lines
            inputs.slice(0, 6).map((p, i) => {
                const y = 50 + i * 30;
                return React.createElement('g', { key: p.name },
                    React.createElement('rect', { x: 10, y: y - 10, width: 90, height: 20, rx: 6, fill: 'rgba(0,242,254,0.08)', stroke: 'rgba(0,242,254,0.3)', strokeWidth: 1 }),
                    React.createElement('text', { x: 55, y: y + 4, textAnchor: 'middle', fill: '#00f2fe', fontSize: 9, fontFamily: 'JetBrains Mono, monospace' }, p.name),
                    React.createElement('line', { x1: 100, y1: y, x2: cx - boxW / 2, y2: svgH / 2 - boxH / 2 + boxH / 4 + i * 12, stroke: 'rgba(0,242,254,0.25)', strokeWidth: 1, markerEnd: 'url(#arrowViz)' })
                );
            }),

            // Main module box
            React.createElement('rect', { x: cx - boxW / 2, y: svgH / 2 - boxH / 2, width: boxW, height: boxH, rx: 12, fill: 'rgba(0,242,254,0.06)', stroke: '#00f2fe', strokeWidth: 1.5, filter: 'drop-shadow(0 0 8px rgba(0,242,254,0.3))' }),
            React.createElement('text', { x: cx, y: svgH / 2 - 20, textAnchor: 'middle', fill: '#00f2fe', fontSize: 13, fontWeight: 'bold', fontFamily: 'JetBrains Mono, monospace' }, moduleName),
            React.createElement('text', { x: cx, y: svgH / 2 - 5, textAnchor: 'middle', fill: '#4facfe', fontSize: 9, fontFamily: 'sans-serif' }, `${ports?.length || 0} ports • ${hierarchy.lineCount || 0} lines`),
            states?.length > 0 && React.createElement('text', { x: cx, y: svgH / 2 + 10, textAnchor: 'middle', fill: '#e100ff', fontSize: 9, fontFamily: 'sans-serif' }, `FSM: ${states.length} states`),

            // Submodule instances
            (instances || []).slice(0, 4).map((inst, i) => {
                const ix = cx + boxW / 2 + 20;
                const iy = 40 + i * 90;
                return React.createElement('g', { key: inst.instance },
                    React.createElement('rect', { x: ix, y: iy, width: 130, height: 50, rx: 8, fill: 'rgba(127,0,255,0.08)', stroke: 'rgba(127,0,255,0.4)', strokeWidth: 1 }),
                    React.createElement('text', { x: ix + 65, y: iy + 18, textAnchor: 'middle', fill: '#c084fc', fontSize: 9, fontWeight: 'bold', fontFamily: 'JetBrains Mono, monospace' }, inst.type),
                    React.createElement('text', { x: ix + 65, y: iy + 33, textAnchor: 'middle', fill: '#9ca3af', fontSize: 8, fontFamily: 'sans-serif' }, inst.instance),
                    React.createElement('line', { x1: cx + boxW / 2, y1: svgH / 2, x2: ix, y2: iy + 25, stroke: 'rgba(127,0,255,0.3)', strokeWidth: 1, markerEnd: 'url(#arrowViz)' })
                );
            }),

            // Output lines
            outputs.slice(0, 4).map((p, i) => {
                const y = 50 + i * 30;
                return React.createElement('g', { key: p.name },
                    React.createElement('rect', { x: svgW - 100, y: y - 10, width: 90, height: 20, rx: 6, fill: 'rgba(0,255,136,0.08)', stroke: 'rgba(0,255,136,0.3)', strokeWidth: 1 }),
                    React.createElement('text', { x: svgW - 55, y: y + 4, textAnchor: 'middle', fill: '#00ff88', fontSize: 9, fontFamily: 'JetBrains Mono, monospace' }, p.name),
                    React.createElement('line', { x1: cx + boxW / 2, y1: svgH / 2 - boxH / 2 + boxH / 4 + i * 12, x2: svgW - 100, y2: y, stroke: 'rgba(0,255,136,0.25)', strokeWidth: 1, markerEnd: 'url(#arrowViz)' })
                );
            })
        )
    );
}

// ── FSM Diagram ────────────────────────────────
function FsmDiagram({ states }) {
    if (!states || states.length === 0) return null;

    const R = 28;
    const svgW = 500;
    const angleStep = (2 * Math.PI) / states.length;
    const radius = 120;
    const cx = svgW / 2;
    const cy = 140;

    const nodePositions = states.map((_, i) => ({
        x: cx + radius * Math.cos(i * angleStep - Math.PI / 2),
        y: cy + radius * Math.sin(i * angleStep - Math.PI / 2)
    }));

    return React.createElement(
        'svg',
        { width: svgW, height: 280, viewBox: `0 0 ${svgW} 280`, className: 'max-w-full' },
        React.createElement('defs', null,
            React.createElement('marker', { id: 'fsmArrow', markerWidth: 8, markerHeight: 6, refX: 8, refY: 3, orient: 'auto' },
                React.createElement('polygon', { points: '0 0, 8 3, 0 6', fill: 'rgba(225,0,255,0.6)' })
            )
        ),
        // Draw arcs between consecutive states
        states.slice(0, -1).map((_, i) => {
            const from = nodePositions[i];
            const to   = nodePositions[i + 1];
            return React.createElement('line', { key: i, x1: from.x, y1: from.y, x2: to.x, y2: to.y, stroke: 'rgba(225,0,255,0.3)', strokeWidth: 1.5, markerEnd: 'url(#fsmArrow)' });
        }),
        // Last to first arc
        states.length > 1 && React.createElement('line', { x1: nodePositions[states.length-1].x, y1: nodePositions[states.length-1].y, x2: nodePositions[0].x, y2: nodePositions[0].y, stroke: 'rgba(225,0,255,0.15)', strokeWidth: 1, strokeDasharray: '4 4' }),
        // Draw state nodes
        states.map((state, i) => {
            const { x, y } = nodePositions[i];
            const isIdle = state.toUpperCase().includes('IDLE') || i === 0;
            return React.createElement('g', { key: state },
                React.createElement('circle', { cx: x, cy: y, r: R, fill: isIdle ? 'rgba(0,242,254,0.12)' : 'rgba(225,0,255,0.08)', stroke: isIdle ? '#00f2fe' : '#e100ff', strokeWidth: 1.5, filter: `drop-shadow(0 0 6px ${isIdle ? '#00f2fe' : '#e100ff'}80)` }),
                React.createElement('text', { x, y: y + 3, textAnchor: 'middle', fill: isIdle ? '#00f2fe' : '#e100ff', fontSize: 8, fontWeight: 'bold', fontFamily: 'JetBrains Mono, monospace' },
                    state.length > 8 ? state.slice(0, 8) + '…' : state
                )
            );
        }),
        React.createElement('text', { x: cx, y: 260, textAnchor: 'middle', fill: '#4b5563', fontSize: 10, fontFamily: 'sans-serif' },
            `${states.length} FSM states detected`
        )
    );
}

export default function Visualization() {
    const { activeFile } = useAppState();
    const [hierarchy, setHierarchy] = useState(null);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('hierarchy');

    const fetchHierarchy = async () => {
        if (!activeFile?.content) return;
        setLoading(true);
        try {
            const data = await apiGetHierarchy(activeFile.content);
            setHierarchy(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (activeFile?.content) fetchHierarchy();
    }, [activeFile?.id]);

    const tabs = [
        { id: 'hierarchy',  label: 'RTL Hierarchy',     icon: Layers },
        { id: 'fsm',        label: 'FSM Diagram',        icon: GitBranch },
        { id: 'heatmap',    label: 'Error Heatmap',      icon: Zap },
        { id: 'ports',      label: 'Port Summary',       icon: Share2 },
    ];

    return React.createElement(
        'div',
        { className: 'flex-1 p-6 space-y-6 bg-cyber-black overflow-y-auto max-h-[calc(100vh-80px)]' },

        // Header
        React.createElement(
            'div',
            { className: 'flex items-center justify-between border-b border-white/5 pb-5' },
            React.createElement('div', null,
                React.createElement('h1', { className: 'text-2xl font-extrabold tracking-wider bg-gradient-to-r from-cyber-purple via-cyber-neon to-cyber-blue bg-clip-text text-transparent' }, 'VISUALIZATION'),
                React.createElement('p', { className: 'text-xs text-gray-500 mt-1' },
                    activeFile ? `Module: ${hierarchy?.moduleName || '...'}` : 'Load a file to visualize'
                )
            ),
            React.createElement(
                'button',
                { onClick: fetchHierarchy, disabled: loading || !activeFile, className: 'flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-cyber-purple/20 to-cyber-neon/20 border border-cyber-purple/30 hover:border-cyber-purple text-cyber-purple text-sm font-semibold disabled:opacity-40 transition-all' },
                React.createElement(RefreshCw, { className: `w-4 h-4 ${loading ? 'animate-spin' : ''}` }),
                loading ? 'Extracting...' : 'Re-extract'
            )
        ),

        !activeFile && React.createElement(
            'div',
            { className: 'flex flex-col items-center justify-center py-20 text-center gap-4' },
            React.createElement('div', { className: 'p-5 bg-white/5 rounded-full border border-white/10' },
                React.createElement(Share2, { className: 'w-10 h-10 text-gray-500' })
            ),
            React.createElement('h3', { className: 'text-xl font-bold text-white' }, 'No File Loaded'),
            React.createElement('p', { className: 'text-sm text-gray-400 max-w-sm' }, 'Load a Verilog/SystemVerilog file in the RTL Analyzer to generate visualizations.')
        ),

        hierarchy && React.createElement(
            'div',
            { className: 'space-y-5' },

            // Tabs
            React.createElement(
                'div',
                { className: 'flex gap-1 bg-white/3 rounded-xl p-1 border border-white/5 w-fit' },
                tabs.map(tab => React.createElement(
                    'button',
                    {
                        key: tab.id,
                        onClick: () => setActiveTab(tab.id),
                        className: `flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                            activeTab === tab.id
                                ? 'bg-gradient-to-r from-cyber-purple/30 to-cyber-neon/20 text-white border border-cyber-purple/40'
                                : 'text-gray-400 hover:text-white'
                        }`
                    },
                    React.createElement(tab.icon, { className: 'w-3.5 h-3.5' }),
                    tab.label
                ))
            ),

            // Content
            React.createElement(
                GlassCard,
                { className: 'p-6 min-h-[350px]' },

                activeTab === 'hierarchy' && React.createElement(
                    'div',
                    { className: 'space-y-4' },
                    React.createElement('h3', { className: 'font-bold text-white' }, 'RTL Module Hierarchy'),
                    React.createElement('p', { className: 'text-xs text-gray-500' }, 'Blue = inputs, Green = outputs, Purple = submodule instances'),
                    React.createElement(HierarchyGraph, { hierarchy })
                ),

                activeTab === 'fsm' && React.createElement(
                    'div',
                    { className: 'space-y-4' },
                    React.createElement('h3', { className: 'font-bold text-white' }, 'FSM State Diagram'),
                    hierarchy.states?.length > 0
                        ? React.createElement(FsmDiagram, { states: hierarchy.states })
                        : React.createElement('div', { className: 'flex flex-col items-center justify-center py-12 text-gray-500 gap-3' },
                            React.createElement(GitBranch, { className: 'w-8 h-8' }),
                            React.createElement('p', null, 'No FSM states detected in this module')
                          )
                ),

                activeTab === 'heatmap' && React.createElement(
                    'div',
                    { className: 'space-y-4' },
                    React.createElement(ErrorHeatmap, {
                        code: activeFile?.content || '',
                        issues: activeFile?.analysisResult?.issues || []
                    })
                ),

                activeTab === 'ports' && React.createElement(
                    'div',
                    { className: 'space-y-4' },
                    React.createElement('h3', { className: 'font-bold text-white' }, 'Port & Signal Summary'),
                    React.createElement(
                        'div',
                        { className: 'grid grid-cols-1 md:grid-cols-3 gap-4' },
                        [
                            { label: 'Inputs',    items: hierarchy.ports?.filter(p => p.direction === 'input'), color: '#00f2fe' },
                            { label: 'Outputs',   items: hierarchy.ports?.filter(p => p.direction === 'output'), color: '#00ff88' },
                            { label: 'Instances', items: hierarchy.instances?.map(i => ({ name: `${i.instance} (${i.type})` })), color: '#e100ff' },
                        ].map(group => React.createElement(
                            'div',
                            { key: group.label, className: 'p-4 rounded-xl bg-white/3 border border-white/5' },
                            React.createElement('h4', { className: 'text-xs font-bold mb-3 uppercase tracking-wider', style: { color: group.color } }, `${group.label} (${group.items?.length || 0})`),
                            React.createElement('div', { className: 'space-y-1.5' },
                                (group.items || []).map((item, i) =>
                                    React.createElement('div', { key: i, className: 'flex items-center gap-2 text-xs text-gray-300' },
                                        React.createElement('div', { className: 'w-1.5 h-1.5 rounded-full flex-shrink-0', style: { background: group.color } }),
                                        React.createElement('span', { className: 'font-mono' }, item.name || item)
                                    )
                                ),
                                (!group.items || group.items.length === 0) && React.createElement('p', { className: 'text-[10px] text-gray-600' }, 'None detected')
                            )
                        ))
                    )
                )
            )
        )
    );
}
