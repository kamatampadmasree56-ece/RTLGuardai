import React, { useState, useEffect } from 'https://esm.sh/react@18.2.0';
import { useAppState } from '../utils/appState.js';
import { apiGetCoverage } from '../utils/api.js';
import DonutChart from '../components/DonutChart.js';
import GlassCard from '../components/GlassCard.js';
import { BarChart2, RefreshCw, AlertCircle, CheckCircle, Target, Activity, Cpu, GitBranch, ToggleLeft, Layers } from 'https://esm.sh/lucide-react@0.344.0';

const COVERAGE_COLORS = {
    statement:  '#00f2fe',
    branch:     '#4facfe',
    toggle:     '#7f00ff',
    fsm:        '#e100ff',
    functional: '#00ff88',
};

const COVERAGE_ICONS = {
    statement:  Activity,
    branch:     GitBranch,
    toggle:     ToggleLeft,
    fsm:        Layers,
    functional: Target,
};

function CoverageBar({ label, percentage, covered, total, color }) {
    return React.createElement(
        'div',
        { className: 'space-y-2' },
        React.createElement(
            'div',
            { className: 'flex items-center justify-between' },
            React.createElement('span', { className: 'text-sm font-semibold text-gray-300' }, label),
            React.createElement(
                'div',
                { className: 'flex items-center gap-3 text-xs text-gray-500' },
                React.createElement('span', null, `${covered} / ${total} items`),
                React.createElement('span', { className: 'font-bold text-sm', style: { color } }, `${percentage}%`)
            )
        ),
        React.createElement(
            'div',
            { className: 'w-full h-3 bg-white/5 rounded-full overflow-hidden' },
            React.createElement('div', {
                className: 'h-full rounded-full coverage-bar',
                style: {
                    width: `${percentage}%`,
                    background: `linear-gradient(90deg, ${color}aa, ${color})`,
                    boxShadow: `0 0 8px ${color}40`
                }
            })
        )
    );
}

export default function CoverageAnalysis() {
    const { activeFile } = useAppState();
    const [coverage, setCoverage] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchCoverage = async () => {
        const code = activeFile?.content;
        if (!code) return;
        setLoading(true);
        setError(null);
        try {
            const data = await apiGetCoverage(code);
            setCoverage(data);
        } catch (e) {
            setError(e.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (activeFile?.content) fetchCoverage();
    }, [activeFile?.id]);

    const TYPES = ['statement', 'branch', 'toggle', 'fsm', 'functional'];

    const EmptyState = () => React.createElement(
        'div',
        { className: 'flex-1 flex flex-col items-center justify-center text-center gap-4 py-20' },
        React.createElement('div', { className: 'p-5 bg-white/5 rounded-full border border-white/10 glow-teal' },
            React.createElement(BarChart2, { className: 'w-10 h-10 text-cyber-teal' })
        ),
        React.createElement('h3', { className: 'text-xl font-bold text-white' }, 'No Coverage Data'),
        React.createElement('p', { className: 'text-sm text-gray-400 max-w-sm' },
            'Load a Verilog file in the RTL Analyzer first, then return here to view coverage metrics.'
        )
    );

    return React.createElement(
        'div',
        { className: 'flex-1 p-6 space-y-6 bg-cyber-black overflow-y-auto max-h-[calc(100vh-80px)]' },

        // Header
        React.createElement(
            'div',
            { className: 'flex items-center justify-between border-b border-white/5 pb-5' },
            React.createElement('div', null,
                React.createElement('h1', { className: 'text-2xl font-extrabold tracking-wider bg-gradient-to-r from-cyber-green via-cyber-teal to-cyber-blue bg-clip-text text-transparent' }, 'COVERAGE ANALYSIS'),
                React.createElement('p', { className: 'text-xs text-gray-500 mt-1' },
                    activeFile ? `Analyzing: ${activeFile.name}` : 'No file selected'
                )
            ),
            React.createElement(
                'button',
                {
                    onClick: fetchCoverage,
                    disabled: loading || !activeFile,
                    className: 'flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-cyber-green/20 to-cyber-teal/20 border border-cyber-teal/30 hover:border-cyber-teal text-cyber-teal text-sm font-semibold disabled:opacity-40 transition-all'
                },
                React.createElement(RefreshCw, { className: `w-4 h-4 ${loading ? 'animate-spin' : ''}` }),
                loading ? 'Analyzing...' : 'Re-analyze'
            )
        ),

        !activeFile && React.createElement(EmptyState),

        error && React.createElement(
            'div',
            { className: 'flex items-center gap-3 bg-rose-500/10 border border-rose-500/20 rounded-xl p-4 text-rose-400 text-sm' },
            React.createElement(AlertCircle, { className: 'w-5 h-5 flex-shrink-0' }),
            error
        ),

        loading && React.createElement(
            'div',
            { className: 'grid grid-cols-5 gap-4' },
            TYPES.map(t => React.createElement('div', { key: t, className: 'skeleton h-40 rounded-2xl' }))
        ),

        coverage && !loading && React.createElement(
            'div',
            { className: 'space-y-6' },

            // Overall Score
            React.createElement(
                GlassCard,
                { className: 'p-6 text-center glass-panel-glow' },
                React.createElement(
                    'div',
                    { className: 'flex items-center justify-center gap-8' },
                    React.createElement(
                        'div',
                        { className: 'flex flex-col items-center' },
                        React.createElement('div', { className: 'relative w-32 h-32' },
                            React.createElement('svg', { width: 128, height: 128, viewBox: '0 0 128 128' },
                                React.createElement('circle', { cx: 64, cy: 64, r: 54, fill: 'none', stroke: 'rgba(255,255,255,0.05)', strokeWidth: 14 }),
                                React.createElement('circle', { cx: 64, cy: 64, r: 54, fill: 'none', stroke: '#00f2fe', strokeWidth: 14, strokeLinecap: 'round',
                                    strokeDasharray: 339.29,
                                    strokeDashoffset: 339.29 - (339.29 * coverage.overall / 100),
                                    transform: 'rotate(-90 64 64)',
                                    className: 'gauge-ring',
                                    style: { filter: 'drop-shadow(0 0 6px #00f2fe)' }
                                })
                            ),
                            React.createElement('div', { className: 'absolute inset-0 flex flex-col items-center justify-center' },
                                React.createElement('span', { className: 'text-3xl font-black text-cyber-teal' }, `${coverage.overall}%`),
                                React.createElement('span', { className: 'text-[10px] text-gray-500 font-semibold' }, 'OVERALL')
                            )
                        )
                    ),
                    React.createElement('div', { className: 'space-y-3 text-left' },
                        React.createElement('h2', { className: 'text-xl font-bold text-white' }, 'Coverage Summary'),
                        React.createElement('p', { className: 'text-sm text-gray-400' },
                            coverage.overall >= 90 ? '✅ Excellent coverage — design is well-verified' :
                            coverage.overall >= 75 ? '🟡 Good coverage — consider adding more corner cases' :
                            coverage.overall >= 60 ? '🟠 Moderate coverage — several areas need testing' :
                            '🔴 Low coverage — significant testing gaps detected'
                        ),
                        React.createElement('div', { className: 'flex flex-wrap gap-2' },
                            TYPES.map(t => React.createElement('span', {
                                key: t,
                                className: 'px-3 py-1 rounded-full text-xs font-semibold',
                                style: { background: `${COVERAGE_COLORS[t]}15`, color: COVERAGE_COLORS[t], border: `1px solid ${COVERAGE_COLORS[t]}30` }
                            }, `${(coverage[t]?.label || t).replace(' Coverage', '')}: ${coverage[t]?.percentage || 0}%`)
                            )
                        )
                    )
                )
            ),

            // Donut Charts Row
            React.createElement(
                'div',
                { className: 'grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4' },
                TYPES.map(type => {
                    const d = coverage[type] || {};
                    const Icon = COVERAGE_ICONS[type];
                    return React.createElement(
                        GlassCard,
                        { key: type, className: 'p-5 flex flex-col items-center gap-3 stat-card cursor-default' },
                        React.createElement(Icon, { className: 'w-5 h-5 text-gray-500' }),
                        React.createElement(DonutChart, {
                            percentage: d.percentage || 0,
                            size: 90,
                            strokeWidth: 8,
                            color: COVERAGE_COLORS[type],
                            label: '',
                            animated: true
                        }),
                        React.createElement('div', { className: 'text-center' },
                            React.createElement('p', { className: 'text-xs font-bold text-white' }, d.label || type),
                            React.createElement('p', { className: 'text-[10px] text-gray-500 mt-0.5' }, `${d.covered || 0} / ${d.total || 0}`)
                        )
                    );
                })
            ),

            // Detail Bars
            React.createElement(
                GlassCard,
                { className: 'p-6' },
                React.createElement('h3', { className: 'font-bold text-white mb-5' }, 'Detailed Coverage Breakdown'),
                React.createElement(
                    'div',
                    { className: 'space-y-5' },
                    TYPES.map(type => React.createElement(CoverageBar, {
                        key: type,
                        label: coverage[type]?.label || type,
                        percentage: coverage[type]?.percentage || 0,
                        covered: coverage[type]?.covered || 0,
                        total: coverage[type]?.total || 0,
                        color: COVERAGE_COLORS[type]
                    }))
                )
            ),

            // Uncovered items
            coverage.uncoveredItems?.filter(Boolean).length > 0 && React.createElement(
                GlassCard,
                { className: 'p-6' },
                React.createElement('h3', { className: 'font-bold text-white mb-4 flex items-center gap-2' },
                    React.createElement(AlertCircle, { className: 'w-4 h-4 text-amber-400' }),
                    'Uncovered Items to Address'
                ),
                React.createElement('div', { className: 'space-y-2' },
                    coverage.uncoveredItems.filter(Boolean).map((item, i) =>
                        React.createElement('div', { key: i, className: 'flex items-center gap-3 p-3 rounded-xl bg-amber-500/5 border border-amber-500/15 text-sm text-amber-300' },
                            React.createElement('span', { className: 'text-amber-400 flex-shrink-0' }, '⚠'),
                            item
                        )
                    )
                )
            )
        )
    );
}
