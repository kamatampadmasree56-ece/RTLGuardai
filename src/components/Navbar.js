import React from 'https://esm.sh/react@18.2.0';
import { useAppState } from '../utils/appState.js';
import {
    Bell,
    Shield,
    CheckCircle,
    Activity,
    Settings,
    ChevronRight,
    WifiOff,
    Wifi,
    FileCode
} from 'https://esm.sh/lucide-react@0.344.0';

export default function Navbar() {
    const { activeView, files, user, activeFile, setView, backendOk } = useAppState();

    if (!user) return null;

    const fileCount = files.length;
    const avgScore  = fileCount > 0
        ? Math.round(files.reduce((acc, f) => acc + (f.analysisResult?.scores?.overall || 100), 0) / fileCount)
        : 100;

    const VIEW_LABELS = {
        dashboard:    'Command Dashboard',
        analyzer:     'AI Static RTL Analyzer',
        testbench:    'AI Testbench Generator',
        coverage:     'Coverage Analysis',
        chat:         'AI Assistant',
        visualization:'Visualization',
        reports:      'Reports & Export',
        rules:        'Lint Rules Database',
        about:        'About RTLGuard Engine',
        settings:     'Settings & Profile',
    };
    const viewTitle = VIEW_LABELS[activeView] || 'RTLGuard AI';

    const userInitials = (user.name || 'U').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

    return React.createElement(
        'header',
        { className: 'h-20 bg-cyber-dark/85 border-b border-white/5 px-6 flex items-center justify-between z-10 backdrop-blur-md sticky top-0' },

        // Left: View title + file breadcrumb
        React.createElement(
            'div',
            { className: 'flex items-center gap-3 min-w-0' },
            React.createElement(
                'div',
                { className: 'flex flex-col' },
                React.createElement('h1', { className: 'text-base font-bold text-white tracking-wide glow-text-teal leading-tight' }, viewTitle),

                // Breadcrumb: show active file when in analyzer/coverage/visualization
                (activeFile && ['analyzer', 'coverage', 'visualization'].includes(activeView))
                    ? React.createElement(
                        'div',
                        { className: 'flex items-center gap-1 mt-0.5' },
                        React.createElement('span', { className: 'text-[10px] text-gray-600' }, 'Active:'),
                        React.createElement(FileCode, { className: 'w-3 h-3 text-cyber-teal' }),
                        React.createElement('span', { className: 'text-[10px] font-mono text-cyber-teal truncate max-w-[160px]' }, activeFile.name)
                    )
                    : null
            ),

            // Backend connection badge (only on smaller screens hide the full text)
            React.createElement(
                'div',
                {
                    className: `hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-semibold border ${
                        backendOk === true
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : backendOk === false
                                ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                                : 'bg-gray-500/10 text-gray-500 border-gray-500/20'
                    }`
                },
                React.createElement(
                    backendOk === false ? WifiOff : Wifi,
                    { className: 'w-3 h-3' }
                ),
                React.createElement(
                    'span',
                    { className: 'hidden md:inline' },
                    backendOk === true ? 'DB Connected'
                        : backendOk === false ? 'DB Offline'
                        : 'Connecting…'
                ),
                // Animated pulse dot for "connected"
                backendOk === true && React.createElement('div', {
                    className: 'w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse'
                })
            )
        ),

        // Right: Metrics + Bell + Settings avatar
        React.createElement(
            'div',
            { className: 'flex items-center gap-4' },

            // Metric: Modules
            React.createElement(
                'div',
                { className: 'hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs' },
                React.createElement('span', { className: 'text-gray-400' }, 'Modules:'),
                React.createElement('span', { className: 'font-bold text-cyber-teal' }, fileCount)
            ),

            // Metric: Avg Score
            React.createElement(
                'div',
                { className: 'hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs' },
                React.createElement('span', { className: 'text-gray-400' }, 'Avg Score:'),
                React.createElement(
                    'span',
                    {
                        className: `font-bold ${
                            avgScore >= 85 ? 'text-emerald-400' : avgScore >= 70 ? 'text-amber-400' : 'text-rose-400'
                        }`
                    },
                    `${avgScore}%`
                )
            ),

            // System status
            React.createElement(
                'div',
                { className: 'hidden md:flex items-center gap-2' },
                React.createElement('span', { className: 'text-xs text-right' },
                    React.createElement('p', { className: 'text-[11px] font-semibold text-white' }, 'System Status'),
                    React.createElement('p', { className: 'text-cyber-teal flex items-center gap-1 justify-end font-mono text-[10px]' },
                        React.createElement(Activity, { className: 'w-2.5 h-2.5 animate-pulse' }),
                        'SECURE_MODE'
                    )
                ),
                React.createElement(
                    'div',
                    { className: 'p-2 bg-gradient-to-tr from-cyber-teal/20 to-cyber-purple/20 border border-cyber-teal/30 rounded-lg text-cyber-teal' },
                    React.createElement(Shield, { className: 'w-4 h-4' })
                )
            ),

            // Notification bell
            React.createElement(
                'button',
                { className: 'p-2 rounded-lg bg-white/5 border border-white/10 hover:border-cyber-teal text-gray-400 hover:text-white transition-all relative' },
                React.createElement(Bell, { className: 'w-4 h-4' }),
                React.createElement('span', { className: 'absolute top-1 right-1 w-1.5 h-1.5 bg-cyber-neon rounded-full' })
            ),

            // User avatar → Settings
            React.createElement(
                'button',
                {
                    onClick: () => setView('settings'),
                    className: 'flex items-center gap-2 hover:opacity-90 transition-opacity group',
                    title: 'Settings & Profile'
                },
                user.avatar
                    ? React.createElement('img', {
                        src: user.avatar, alt: user.name,
                        className: 'w-8 h-8 rounded-full border border-cyber-teal/40 object-cover group-hover:ring-2 ring-cyber-teal/30 transition-all'
                    })
                    : React.createElement(
                        'div',
                        { className: 'w-8 h-8 rounded-full bg-gradient-to-br from-cyber-teal to-cyber-blue flex items-center justify-center text-black font-bold text-xs group-hover:ring-2 ring-cyber-teal/30 transition-all' },
                        userInitials
                    ),
                React.createElement(Settings, { className: 'w-3.5 h-3.5 text-gray-600 group-hover:text-cyber-teal transition-colors hidden sm:block' })
            )
        )
    );
}
