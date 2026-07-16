import React from 'https://esm.sh/react@18.2.0';
import { useAppState } from '../utils/appState.js';
import GlassCard from '../components/GlassCard.js';
import DonutChart from '../components/DonutChart.js';
import { 
    Cpu, 
    ShieldAlert, 
    Zap, 
    FileText, 
    Plus, 
    TrendingUp, 
    AlertTriangle,
    Eye,
    Trash2,
    BarChart2,
    AlertCircle,
    CheckCircle,
    Activity,
    Target,
    Layers,
    Wrench,
    Sparkles,
    Shield
} from 'https://esm.sh/lucide-react@0.344.0';

export default function Dashboard() {
    const { 
        files, 
        setView, 
        setActiveFileId, 
        deleteFile,
        user 
    } = useAppState();

    const totalModules = files.length;

    // ── Statistical Calculations
    const getAvgScore = (key) => {
        if (totalModules === 0) return 100;
        const total = files.reduce((acc, f) => {
            const scores = f.analysisResult?.scores || {};
            return acc + (scores[key] || 100);
        }, 0);
        return Math.round(total / totalModules);
    };

    const avgQuality = getAvgScore('quality');
    const avgSecurity = getAvgScore('security');
    const avgPerformance = getAvgScore('performance');
    const avgPower = getAvgScore('power');
    const avgStandards = getAvgScore('standards');
    const avgMaintainability = getAvgScore('maintainability');
    const avgSynthesizability = getAvgScore('synthesizability');
    const avgOverall = getAvgScore('overall');

    const totalErrors = files.reduce((acc, f) => acc + (f.analysisResult?.stats?.errors || f.analysisResult?.stats?.totalErrors || 0), 0);
    const totalWarnings = files.reduce((acc, f) => acc + (f.analysisResult?.stats?.warnings || f.analysisResult?.stats?.totalWarnings || 0), 0);
    const totalIssues = files.reduce((acc, f) => acc + (f.analysisResult?.issues?.length || 0), 0);
    const totalSuggestions = files.reduce((acc, f) => acc + (f.analysisResult?.suggestions?.length || 0), 0);

    // Sum auto-fixes metrics
    const totalAutoFixes = files.reduce((acc, f) => {
        const sum = f.analysisResult?.autoFixSummary?.["Total Auto Fixes"] || 0;
        return acc + sum;
    }, 0);

    const handleSelectFile = (fileId) => {
        setActiveFileId(fileId);
        setView('analyzer');
    };

    // Score History Trend Plot
    const scoreHistory = [...files].reverse().map(f => f.analysisResult?.scores?.overall || 100);

    return React.createElement(
        'div',
        { className: 'flex-1 p-6 space-y-6 bg-cyber-black overflow-y-auto max-h-[calc(100vh-80px)]' },
        
        // ── 1. Top Greeting Banner
        React.createElement(
            'div',
            { className: 'flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-5' },
            React.createElement(
                'div',
                null,
                React.createElement('h1', { className: 'text-2xl font-extrabold tracking-wider bg-gradient-to-r from-cyber-teal via-cyber-blue to-cyber-neon bg-clip-text text-transparent glow-text-teal' }, 'RTL QUALITY DASHBOARD'),
                React.createElement('p', { className: 'text-xs text-gray-500 mt-1' }, `Welcome back, ${user?.name || 'Engineer'}. Automated lint diagnostics online.`)
            ),
            React.createElement(
                'div',
                { className: 'flex items-center gap-2' },
                React.createElement(
                    'button',
                    {
                        onClick: () => setView('analyzer'),
                        className: 'flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-cyber-teal to-cyber-blue text-black font-extrabold text-xs tracking-wider shadow-lg hover:opacity-90 active:scale-95 transition-all'
                    },
                    React.createElement(Plus, { className: 'w-4 h-4' }),
                    'NEW ANALYZER RUN'
                )
            )
        ),

        // ── 2. KPI 8 Stats Grid
        React.createElement(
            'div',
            { className: 'grid grid-cols-2 md:grid-cols-4 gap-4' },
            [
                { label: 'Scanned Modules', val: totalModules, desc: 'Active Verilog components', icon: Cpu, color: 'text-cyber-teal', bg: 'bg-cyber-teal/10' },
                { label: 'Unresolved Errors', val: totalErrors, desc: 'Critical compile issues', icon: AlertCircle, color: totalErrors > 0 ? 'text-red-400' : 'text-emerald-400', bg: 'bg-red-500/10' },
                { label: 'Unresolved Warnings', val: totalWarnings, desc: 'Linter violation paths', icon: AlertTriangle, color: totalWarnings > 0 ? 'text-amber-400' : 'text-emerald-400', bg: 'bg-amber-500/10' },
                { label: 'Total Auto Fixes', val: totalAutoFixes, desc: 'Repaired by Auto-Correct', icon: Wrench, color: 'text-cyber-teal font-mono', bg: 'bg-cyber-teal/10' },
                { label: 'RTL Lint Quality', val: `${avgQuality}%`, desc: 'Linter rule conformance', icon: Target, color: 'text-cyber-teal', bg: 'bg-cyber-teal/10' },
                { label: 'CDC & Timing Score', val: `${avgPerformance}%`, desc: 'CDC clock domain crossing', icon: Activity, color: 'text-cyber-green', bg: 'bg-cyber-green/10' },
                { label: 'Synthesizability', val: `${avgSynthesizability}%`, desc: 'Logic synthesis readiness', icon: Layers, color: 'text-cyber-blue', bg: 'bg-cyber-blue/10' },
                { label: 'Power Efficiency', val: `${avgPower}%`, desc: 'Gated clock opportunities', icon: Zap, color: 'text-purple-400', bg: 'bg-purple-500/10' }
            ].map((card, i) => 
                React.createElement(
                    GlassCard,
                    { key: i, className: 'p-4 flex items-center justify-between stat-card cursor-default' },
                    React.createElement(
                        'div',
                        { className: 'space-y-1 text-left' },
                        React.createElement('p', { className: 'text-[10px] text-gray-500 font-bold uppercase tracking-wider' }, card.label),
                        React.createElement('p', { className: `text-xl font-black ${card.color}` }, card.val),
                        React.createElement('p', { className: 'text-[9px] text-gray-600 font-semibold' }, card.desc)
                    ),
                    React.createElement(
                        'div',
                        { className: `p-2 rounded-lg ${card.bg} ${card.color} hidden sm:block` },
                        React.createElement(card.icon, { className: 'w-4 h-4' })
                    )
                )
            )
        ),

        // ── 3. Upgraded Quality Progress Bars & Chart Row
        React.createElement(
            'div',
            { className: 'grid grid-cols-1 lg:grid-cols-3 gap-6' },
            
            // RTL Compliance Categories Bars
            React.createElement(
                GlassCard,
                { className: 'p-5 flex flex-col min-h-[340px] text-left' },
                React.createElement(
                    'div',
                    { className: 'mb-4 border-b border-white/5 pb-2' },
                    React.createElement('h3', { className: 'font-bold text-sm text-white flex items-center gap-1.5' }, 
                        React.createElement(Target, { className: 'w-4 h-4 text-cyber-teal' }),
                        'RTL Compliance Dimensions'
                    ),
                    React.createElement('p', { className: 'text-[10px] text-gray-500' }, 'Compliance metrics breakdown across key verification scopes')
                ),
                React.createElement(
                    'div',
                    { className: 'flex-1 space-y-4' },
                    [
                        { label: 'RTL Compliance', val: avgOverall, color: 'from-cyber-teal to-cyber-blue' },
                        { label: 'Lint Quality', val: avgQuality, color: 'from-emerald-500 to-teal-400' },
                        { label: 'Security Index', val: avgSecurity, color: 'from-rose-500 to-pink-500' },
                        { label: 'CDC & Timing', val: avgPerformance, color: 'from-amber-500 to-yellow-400' },
                        { label: 'Power Efficiency', val: avgPower, color: 'from-purple-500 to-indigo-500' },
                        { label: 'Coding Standards', val: avgStandards, color: 'from-blue-500 to-cyan-400' },
                        { label: 'Maintainability', val: avgMaintainability, color: 'from-fuchsia-500 to-purple-400' }
                    ].map((scope, idx) => React.createElement(
                        'div',
                        { key: idx, className: 'space-y-1' },
                        React.createElement(
                            'div',
                            { className: 'flex justify-between text-[10px] font-bold font-mono' },
                            React.createElement('span', { className: 'text-gray-400 uppercase' }, scope.label),
                            React.createElement('span', { className: 'text-white' }, `${scope.val}%`)
                        ),
                        React.createElement(
                            'div',
                            { className: 'w-full h-2 bg-black/60 rounded-full overflow-hidden border border-white/5' },
                            React.createElement('div', { 
                                className: `h-full bg-gradient-to-r ${scope.color} rounded-full transition-all duration-500`,
                                style: { width: `${scope.val}%` }
                            })
                        )
                    ))
                )
            ),

            // Score History Timeline Chart
            React.createElement(
                GlassCard,
                { className: 'lg:col-span-2 p-5 flex flex-col justify-between min-h-[340px] text-left' },
                React.createElement(
                    'div',
                    { className: 'mb-4' },
                    React.createElement('h3', { className: 'font-bold text-sm text-white flex items-center gap-1.5' }, 
                        React.createElement(TrendingUp, { className: 'w-4 h-4 text-cyber-blue' }),
                        'Static Verification Timeline'
                    ),
                    React.createElement('p', { className: 'text-xs text-gray-500' }, 'Overall compliance score history across design runs')
                ),
                React.createElement(
                    'div',
                    { className: 'flex-1 h-44 relative flex items-end' },
                    scoreHistory.length < 2 ? React.createElement(
                        'div',
                        { className: 'absolute inset-0 flex flex-col items-center justify-center text-xs text-gray-500 gap-2' },
                        React.createElement(Activity, { className: 'w-8 h-8 text-gray-600 animate-pulse' }),
                        'Additional project runs required to plot trend line'
                    ) : React.createElement(
                        'svg',
                        { className: 'w-full h-full overflow-visible', viewBox: '0 0 500 150', preserveAspectRatio: 'none' },
                        React.createElement('defs', null, 
                            React.createElement('linearGradient', { id: 'chart-glow-dash', x1: 0, y1: 0, x2: 0, y2: 1 },
                                React.createElement('stop', { offset: '0%', stopColor: '#00f2fe', stopOpacity: 0.25 }),
                                React.createElement('stop', { offset: '100%', stopColor: '#00f2fe', stopOpacity: 0.00 })
                            )
                        ),
                        // Grid lines
                        [30, 60, 90, 120].map((y, i) => React.createElement('line', {
                            key: i, x1: 0, y1: y, x2: 500, y2: y, stroke: 'rgba(255, 255, 255, 0.03)', strokeWidth: 1
                        })),
                        // Polyline fill
                        React.createElement('polygon', {
                            points: `0,150 ` + scoreHistory.map((score, idx) => {
                                const x = (idx / (scoreHistory.length - 1)) * 500;
                                const y = 150 - ((score - 30) / 70) * 110 - 15;
                                return `${x},${y}`;
                            }).join(' ') + ` 500,150`,
                            fill: 'url(#chart-glow-dash)'
                        }),
                        // Polyline line
                        React.createElement('polyline', {
                            points: scoreHistory.map((score, idx) => {
                                const x = (idx / (scoreHistory.length - 1)) * 500;
                                const y = 150 - ((score - 30) / 70) * 110 - 15;
                                return `${x},${y}`;
                            }).join(' '),
                            fill: 'none', stroke: '#00f2fe', strokeWidth: 2.5, strokeLinecap: 'round', strokeLinejoin: 'round'
                        }),
                        // Data nodes
                        scoreHistory.map((score, idx) => {
                            const x = (idx / (scoreHistory.length - 1)) * 500;
                            const y = 150 - ((score - 30) / 70) * 110 - 15;
                            return React.createElement('g', { key: idx },
                                React.createElement('circle', { cx: x, cy: y, r: 4, fill: '#070a13', stroke: '#00f2fe', strokeWidth: 2 }),
                                React.createElement('text', { x: x, y: y - 8, fill: '#ffffff', fontSize: 8, fontWeight: 'bold', textAnchor: 'middle', fontFamily: 'monospace' }, `${score}%`)
                            );
                        })
                    )
                ),
                React.createElement(
                    'div',
                    { className: 'flex justify-between mt-4 text-[10px] text-gray-500 font-mono' },
                    scoreHistory.length > 0 ? [
                        React.createElement('span', { key: 'start' }, 'EARLIEST RUN'),
                        React.createElement('span', { key: 'end' }, 'LATEST RUN')
                    ] : React.createElement('span', null)
                )
            )
        ),

        // ── 4. Workspace File Repository
        React.createElement(
            GlassCard,
            { className: 'p-5' },
            React.createElement(
                'div',
                { className: 'flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5 text-left' },
                React.createElement(
                    'div',
                    null,
                    React.createElement('h3', { className: 'font-bold text-sm text-white' }, 'Workspace File Repository'),
                    React.createElement('p', { className: 'text-xs text-gray-500 mt-0.5' }, 'Active Verilog modules and verification components')
                )
            ),
            React.createElement(
                'div',
                { className: 'overflow-x-auto w-full' },
                files.length === 0 ? React.createElement(
                    'div',
                    { className: 'py-12 text-center text-gray-500 text-xs gap-3 flex flex-col items-center' },
                    React.createElement(FileText, { className: 'w-8 h-8 text-gray-600' }),
                    React.createElement('p', null, 'No Verilog source files uploaded yet.')
                ) : React.createElement(
                    'table',
                    { className: 'w-full text-left border-collapse text-xs font-mono' },
                    React.createElement(
                        'thead',
                        null,
                        React.createElement(
                            'tr',
                            { className: 'border-b border-white/5 text-gray-500 font-semibold uppercase tracking-wider' },
                            React.createElement('th', { className: 'pb-3' }, 'Module Name'),
                            React.createElement('th', { className: 'pb-3' }, 'Last Analyzed'),
                            React.createElement('th', { className: 'pb-3' }, 'Quality Score'),
                            React.createElement('th', { className: 'pb-3' }, 'Unresolved Errors'),
                            React.createElement('th', { className: 'pb-3' }, 'Auto Fixes Applied'),
                            React.createElement('th', { className: 'pb-3 text-right' }, 'Actions')
                        )
                    ),
                    React.createElement(
                        'tbody',
                        { className: 'divide-y divide-white/5 text-gray-300' },
                        files.map((file) => {
                            const res = file.analysisResult || { scores: {}, issues: [], autoFixSummary: {} };
                            const errorsCount = res.stats?.errors || 0;
                            const fixesCount = res.autoFixSummary?.["Total Auto Fixes"] || 0;
                            return React.createElement(
                                'tr',
                                { key: file.id, className: 'group hover:bg-white/3' },
                                React.createElement(
                                    'td',
                                    { className: 'py-3.5 flex items-center gap-2 font-semibold text-white' },
                                    React.createElement(FileText, { className: 'w-4 h-4 text-cyber-teal' }),
                                    file.name
                                ),
                                React.createElement('td', { className: 'py-3.5 text-gray-500' }, file.timestamp),
                                React.createElement('td', { className: 'py-3.5 font-bold' }, 
                                    React.createElement('span', { className: res.scores?.overall >= 85 ? 'text-cyber-teal' : 'text-amber-400' }, `${res.scores?.overall || 100}%`)
                                ),
                                React.createElement('td', { className: 'py-3.5' }, 
                                    React.createElement('span', { className: errorsCount > 0 ? 'text-rose-400 font-bold' : 'text-emerald-400 font-bold' }, errorsCount)
                                ),
                                React.createElement('td', { className: 'py-3.5 font-bold text-cyber-blue' }, 
                                    fixesCount > 0 ? `+${fixesCount} Repaired` : '0 Clean'
                                ),
                                React.createElement(
                                    'td',
                                    { className: 'py-3.5 text-right space-x-1.5' },
                                    React.createElement(
                                        'button',
                                        {
                                            onClick: () => handleSelectFile(file.id),
                                            className: 'px-2 py-1 bg-white/5 hover:bg-cyber-teal/15 hover:text-cyber-teal hover:border-cyber-teal/30 border border-white/10 rounded transition-all text-white'
                                        },
                                        'Open'
                                    ),
                                    React.createElement(
                                        'button',
                                        {
                                            onClick: () => deleteFile(file.id),
                                            className: 'px-2 py-1 bg-white/5 hover:bg-red-500/15 hover:text-red-400 hover:border-red-500/30 border border-white/10 rounded transition-all text-white'
                                        },
                                        'Delete'
                                    )
                                )
                            );
                        })
                    )
                )
            )
        )
    );
}
