import React, { useState, useEffect, useMemo } from 'https://esm.sh/react@18.2.0';
import { apiGetRules } from '../utils/api.js';
import GlassCard from '../components/GlassCard.js';
import {
    Search, AlertTriangle, AlertCircle, Info,
    ChevronDown, ChevronRight, BookOpen, Shield,
    Filter, RefreshCw, Wrench, Cpu, Zap, Activity,
    GitBranch, Database, Lock, ToggleLeft, Layers
} from 'https://esm.sh/lucide-react@0.344.0';

// ── Severity badge ───────────────────────────────
function SeverityBadge({ severity }) {
    const cfg = {
        error:   { cls: 'bg-red-500/15 text-red-400 border-red-500/30',    Icon: AlertCircle,   label: 'ERROR' },
        warning: { cls: 'bg-amber-500/15 text-amber-400 border-amber-500/30', Icon: AlertTriangle, label: 'WARN' },
        info:    { cls: 'bg-blue-500/15 text-blue-400 border-blue-500/30',   Icon: Info,          label: 'INFO' },
    }[severity?.toLowerCase()] || { cls: 'bg-gray-500/15 text-gray-400 border-gray-500/30', Icon: Info, label: severity };

    return React.createElement(
        'span',
        { className: `inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${cfg.cls}` },
        React.createElement(cfg.Icon, { className: 'w-2.5 h-2.5' }),
        cfg.label
    );
}

// ── Category chip ────────────────────────────────
const CATEGORY_ICONS = {
    'CDC':           GitBranch,
    'Latch':         ToggleLeft,
    'Reset':         Zap,
    'Sequential':    Activity,
    'Combinational': Cpu,
    'Power':         Zap,
    'Synthesis':     Layers,
    'Naming':        BookOpen,
    'Security':      Lock,
    'Hierarchy':     Database,
    'Timing':        Activity,
    'Style':         BookOpen,
};

function CategoryChip({ category }) {
    const Icon = CATEGORY_ICONS[category] || Shield;
    return React.createElement(
        'span',
        { className: 'inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-cyber-purple/10 text-cyber-purple border border-cyber-purple/20' },
        React.createElement(Icon, { className: 'w-2.5 h-2.5' }),
        category
    );
}

// ── Expandable rule card ─────────────────────────
function RuleCard({ rule }) {
    const [expanded, setExpanded] = useState(false);

    return React.createElement(
        'div',
        {
            className: `border border-white/5 rounded-xl overflow-hidden transition-all duration-200 ${expanded ? 'bg-white/[0.03]' : 'bg-black/20 hover:bg-white/[0.02]'}`
        },
        // Header row
        React.createElement(
            'button',
            {
                onClick: () => setExpanded(v => !v),
                className: 'w-full flex items-center gap-3 p-4 text-left'
            },
            // Expand icon
            React.createElement(
                'div',
                { className: 'flex-shrink-0 text-gray-600' },
                React.createElement(expanded ? ChevronDown : ChevronRight, { className: 'w-4 h-4' })
            ),
            // Rule ID
            React.createElement(
                'code',
                { className: 'flex-shrink-0 text-[11px] font-mono text-cyber-teal bg-cyber-teal/10 px-2 py-0.5 rounded' },
                rule.ruleId
            ),
            // Name
            React.createElement('span', { className: 'flex-1 text-sm font-semibold text-gray-200 min-w-0 truncate' }, rule.name),
            // Badges
            React.createElement(
                'div',
                { className: 'flex items-center gap-2 flex-shrink-0' },
                React.createElement(CategoryChip, { category: rule.category }),
                React.createElement(SeverityBadge, { severity: rule.severity })
            )
        ),

        // Expanded details
        expanded && React.createElement(
            'div',
            { className: 'px-4 pb-4 space-y-4 border-t border-white/5 pt-4' },

            // Description
            React.createElement(
                'div',
                null,
                React.createElement('p', { className: 'text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-1' }, 'Description'),
                React.createElement('p', { className: 'text-sm text-gray-300 leading-relaxed' }, rule.description)
            ),

            // Why dangerous
            rule.why && React.createElement(
                'div',
                { className: 'bg-red-500/5 border border-red-500/15 rounded-lg p-3' },
                React.createElement('p', { className: 'text-[11px] font-semibold text-red-400 uppercase tracking-wide mb-1 flex items-center gap-1' },
                    React.createElement(AlertTriangle, { className: 'w-3 h-3' }),
                    'Why Dangerous'
                ),
                React.createElement('p', { className: 'text-xs text-gray-400 leading-relaxed' }, rule.why)
            ),

            // Recommended fix
            rule.fix && React.createElement(
                'div',
                { className: 'bg-emerald-500/5 border border-emerald-500/15 rounded-lg p-3' },
                React.createElement('p', { className: 'text-[11px] font-semibold text-emerald-400 uppercase tracking-wide mb-1 flex items-center gap-1' },
                    React.createElement(Wrench, { className: 'w-3 h-3' }),
                    'Recommended Fix'
                ),
                React.createElement('p', { className: 'text-xs text-gray-400 leading-relaxed' }, rule.fix)
            ),

            // Confidence
            React.createElement(
                'div',
                { className: 'flex items-center gap-3' },
                React.createElement('span', { className: 'text-[11px] text-gray-600' }, 'Detection confidence:'),
                React.createElement('div', { className: 'flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden' },
                    React.createElement('div', {
                        className: 'h-full rounded-full bg-gradient-to-r from-cyber-teal to-cyber-blue',
                        style: { width: `${rule.confidence || 90}%` }
                    })
                ),
                React.createElement('span', { className: 'text-[11px] font-bold text-cyber-teal' }, `${rule.confidence || 90}%`)
            )
        )
    );
}

export default function RulesDatabase() {
    const [rulesData, setRulesData] = useState(null);
    const [loading, setLoading]     = useState(false);
    const [error, setError]         = useState(null);

    // Filters
    const [search, setSearch]           = useState('');
    const [selCategory, setSelCategory] = useState('all');
    const [selSeverity, setSelSeverity] = useState('all');

    const fetchRules = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await apiGetRules();
            setRulesData(data);
        } catch (e) {
            setError(e.message);
            // Fallback: empty state
            setRulesData({ rules: [], total: 0, filtered: 0, categories: {}, severities: {} });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchRules(); }, []);

    // Client-side filtering (also used in offline mode)
    const filteredRules = useMemo(() => {
        if (!rulesData?.rules) return [];
        return rulesData.rules.filter(rule => {
            const matchCat = selCategory === 'all' || rule.category === selCategory;
            const matchSev = selSeverity === 'all' || rule.severity?.toLowerCase() === selSeverity;
            const q = search.toLowerCase();
            const matchQ = !q || `${rule.ruleId} ${rule.name} ${rule.description} ${rule.category}`.toLowerCase().includes(q);
            return matchCat && matchSev && matchQ;
        });
    }, [rulesData, search, selCategory, selSeverity]);

    const categories = rulesData ? Object.keys(rulesData.categories || {}).sort() : [];
    const sevCounts  = rulesData?.severities || {};

    return React.createElement(
        'div',
        { className: 'flex-1 p-6 space-y-6 bg-cyber-black overflow-y-auto max-h-[calc(100vh-80px)]' },

        // Page Header
        React.createElement(
            'div',
            { className: 'flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-5' },
            React.createElement('div', null,
                React.createElement('h1', {
                    className: 'text-2xl font-extrabold tracking-wider bg-gradient-to-r from-cyber-teal via-cyber-blue to-cyber-neon bg-clip-text text-transparent glow-text-teal'
                }, 'LINT RULES DATABASE'),
                React.createElement('p', { className: 'text-xs text-gray-500 mt-1' },
                    `${rulesData?.total || 0} rules across all lint categories — expand any rule to see why it matters and how to fix it.`
                )
            ),
            React.createElement(
                'button',
                {
                    onClick: fetchRules,
                    disabled: loading,
                    className: 'flex items-center gap-1.5 px-4 py-2 rounded-xl border border-white/10 text-xs font-bold text-gray-400 hover:text-white hover:border-white/20 transition-all active:scale-95'
                },
                React.createElement(RefreshCw, { className: `w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}` }),
                'Refresh'
            )
        ),

        // Stats row
        React.createElement(
            'div',
            { className: 'grid grid-cols-2 sm:grid-cols-4 gap-3' },
            [
                { label: 'Total Rules',    value: rulesData?.total || 0,            color: 'text-cyber-teal',   bg: 'bg-cyber-teal/10',   border: 'border-cyber-teal/20' },
                { label: 'Error Rules',    value: sevCounts.error || 0,             color: 'text-red-400',      bg: 'bg-red-500/10',      border: 'border-red-500/20' },
                { label: 'Warning Rules',  value: sevCounts.warning || 0,           color: 'text-amber-400',    bg: 'bg-amber-500/10',    border: 'border-amber-500/20' },
                { label: 'Categories',     value: Object.keys(rulesData?.categories || {}).length, color: 'text-cyber-purple', bg: 'bg-cyber-purple/10', border: 'border-cyber-purple/20' },
            ].map(s =>
                React.createElement(
                    'div',
                    { key: s.label, className: `${s.bg} border ${s.border} rounded-xl p-4 flex flex-col items-center` },
                    React.createElement('div', { className: `text-2xl font-black ${s.color}` }, s.value),
                    React.createElement('div', { className: 'text-[11px] text-gray-500 mt-0.5 font-medium' }, s.label)
                )
            )
        ),

        // Search & Filters
        React.createElement(
            GlassCard,
            null,
            React.createElement(
                'div',
                { className: 'flex flex-col sm:flex-row gap-3' },

                // Search input
                React.createElement(
                    'div',
                    { className: 'relative flex-1' },
                    React.createElement(Search, { className: 'absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500' }),
                    React.createElement('input', {
                        type: 'text',
                        value: search,
                        onChange: e => setSearch(e.target.value),
                        placeholder: 'Search rule ID, name, description…',
                        className: 'w-full pl-10 pr-4 py-2.5 bg-black/40 border border-white/10 hover:border-white/20 focus:border-cyber-teal focus:ring-1 focus:ring-cyber-teal rounded-xl text-sm text-white placeholder-gray-600 outline-none transition-all'
                    })
                ),

                // Severity filter
                React.createElement(
                    'div',
                    { className: 'relative' },
                    React.createElement(Filter, { className: 'absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500 pointer-events-none' }),
                    React.createElement(
                        'select',
                        {
                            value: selSeverity,
                            onChange: e => setSelSeverity(e.target.value),
                            className: 'pl-8 pr-4 py-2.5 bg-black/40 border border-white/10 hover:border-white/20 focus:border-cyber-teal rounded-xl text-xs text-white outline-none transition-all appearance-none'
                        },
                        React.createElement('option', { value: 'all', className: 'bg-gray-900' }, 'All Severities'),
                        React.createElement('option', { value: 'error', className: 'bg-gray-900' }, '🔴 Error'),
                        React.createElement('option', { value: 'warning', className: 'bg-gray-900' }, '🟡 Warning'),
                        React.createElement('option', { value: 'info', className: 'bg-gray-900' }, '🔵 Info')
                    )
                ),

                // Category filter
                React.createElement(
                    'div',
                    { className: 'relative' },
                    React.createElement(Layers, { className: 'absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500 pointer-events-none' }),
                    React.createElement(
                        'select',
                        {
                            value: selCategory,
                            onChange: e => setSelCategory(e.target.value),
                            className: 'pl-8 pr-4 py-2.5 bg-black/40 border border-white/10 hover:border-white/20 focus:border-cyber-teal rounded-xl text-xs text-white outline-none transition-all appearance-none'
                        },
                        React.createElement('option', { value: 'all', className: 'bg-gray-900' }, 'All Categories'),
                        categories.map(cat =>
                            React.createElement('option', { key: cat, value: cat, className: 'bg-gray-900' },
                                `${cat} (${rulesData.categories[cat]})`
                            )
                        )
                    )
                )
            ),

            // Results count
            React.createElement(
                'p',
                { className: 'text-[11px] text-gray-500 mt-3' },
                `Showing ${filteredRules.length} of ${rulesData?.total || 0} rules`,
                (search || selCategory !== 'all' || selSeverity !== 'all') && React.createElement(
                    'button',
                    {
                        onClick: () => { setSearch(''); setSelCategory('all'); setSelSeverity('all'); },
                        className: 'ml-2 text-cyber-teal hover:underline'
                    },
                    'Clear filters'
                )
            )
        ),

        // Category pills (quick filter)
        React.createElement(
            'div',
            { className: 'flex flex-wrap gap-2' },
            React.createElement(
                'button',
                {
                    onClick: () => setSelCategory('all'),
                    className: `px-3 py-1.5 rounded-full text-[11px] font-semibold border transition-all ${selCategory === 'all' ? 'bg-cyber-teal/20 text-cyber-teal border-cyber-teal/30' : 'border-white/10 text-gray-500 hover:text-white hover:border-white/20'}`
                },
                `All (${rulesData?.total || 0})`
            ),
            categories.map(cat => {
                const Icon = CATEGORY_ICONS[cat] || Shield;
                return React.createElement(
                    'button',
                    {
                        key: cat,
                        onClick: () => setSelCategory(cat === selCategory ? 'all' : cat),
                        className: `flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold border transition-all ${selCategory === cat ? 'bg-cyber-purple/20 text-cyber-purple border-cyber-purple/30' : 'border-white/10 text-gray-500 hover:text-white hover:border-white/20'}`
                    },
                    React.createElement(Icon, { className: 'w-3 h-3' }),
                    `${cat} (${rulesData?.categories[cat] || 0})`
                );
            })
        ),

        // Rules list
        loading
            ? React.createElement(
                'div',
                { className: 'flex flex-col items-center justify-center py-20 gap-3' },
                React.createElement('div', { className: 'w-8 h-8 border-2 border-cyber-teal border-t-transparent rounded-full animate-spin' }),
                React.createElement('p', { className: 'text-sm text-gray-500' }, 'Loading lint rules catalog…')
            )
            : error
                ? React.createElement(
                    'div',
                    { className: 'flex flex-col items-center py-16 gap-3' },
                    React.createElement(AlertCircle, { className: 'w-10 h-10 text-red-400' }),
                    React.createElement('p', { className: 'text-sm text-gray-400 text-center' }, 'Could not load rules from backend.'),
                    React.createElement('p', { className: 'text-xs text-gray-600 text-center max-w-sm' }, 'Start the Flask server and try again: ',
                        React.createElement('code', { className: 'font-mono text-cyber-teal' }, 'python run_server.py')
                    )
                )
                : filteredRules.length === 0
                    ? React.createElement(
                        'div',
                        { className: 'flex flex-col items-center py-16 gap-2' },
                        React.createElement(Search, { className: 'w-10 h-10 text-gray-700' }),
                        React.createElement('p', { className: 'text-sm text-gray-500' }, 'No rules match your filters.'),
                        React.createElement('button', {
                            onClick: () => { setSearch(''); setSelCategory('all'); setSelSeverity('all'); },
                            className: 'text-xs text-cyber-teal hover:underline mt-1'
                        }, 'Clear all filters')
                    )
                    : React.createElement(
                        'div',
                        { className: 'space-y-2' },
                        filteredRules.map(rule =>
                            React.createElement(RuleCard, { key: rule.ruleId, rule })
                        )
                    )
    );
}
