import React from 'https://esm.sh/react@18.2.0';
import { useAppState } from '../utils/appState.js';
import ThemeToggle from './ThemeToggle.js';
import {
    LayoutDashboard,
    ShieldCheck,
    FileBarChart2,
    Info,
    LogOut,
    Cpu,
    ChevronLeft,
    ChevronRight,
    MessageSquare,
    BarChart2,
    Share2,
    AlertCircle,
    AlertTriangle,
    BookOpen,
    Settings
} from 'https://esm.sh/lucide-react@0.344.0';

export default function Sidebar() {
    const {
        activeView, setView, user, logout,
        sidebarOpen, setSidebarOpen,
        files, theme, toggleTheme
    } = useAppState();

    if (!user) return null;

    // Count issues across all files
    const totalErrors   = files.reduce((a, f) => a + (f.analysisResult?.stats?.errors   || 0), 0);
    const totalWarnings = files.reduce((a, f) => a + (f.analysisResult?.stats?.warnings  || 0), 0);

    const menuItems = [
        { id: 'dashboard',    label: 'Dashboard',           icon: LayoutDashboard },
        { id: 'analyzer',     label: 'RTL Analyzer',        icon: ShieldCheck,    badge: totalErrors > 0 ? totalErrors : null, badgeColor: 'bg-red-500' },
        { id: 'testbench',    label: 'AI Testbench',        icon: Cpu },
        { id: 'coverage',     label: 'Coverage Analysis',   icon: BarChart2 },
        { id: 'chat',         label: 'AI Assistant',        icon: MessageSquare },
        { id: 'visualization',label: 'Visualization',       icon: Share2 },
        { id: 'reports',      label: 'Reports & Export',    icon: FileBarChart2 },
        { id: 'rules',        label: 'Lint Rules DB',       icon: BookOpen },
        { id: 'about',        label: 'About Engine',        icon: Info },
    ];

    const userInitials = (user.name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

    return React.createElement(
        'aside',
        {
            className: `bg-cyber-dark/95 border-r border-white/5 min-h-screen transition-all duration-300 flex flex-col relative z-20 ${
                sidebarOpen ? 'w-64' : 'w-20'
            }`
        },

        // ── Logo Header
        React.createElement(
            'div',
            { className: 'p-5 flex items-center gap-3 border-b border-white/5 h-20' },
            React.createElement(
                'div',
                { className: 'p-2 bg-gradient-to-tr from-cyber-teal to-cyber-purple rounded-xl flex items-center justify-center glow-teal flex-shrink-0' },
                React.createElement(Cpu, { className: 'w-5 h-5 text-white' })
            ),
            sidebarOpen && React.createElement(
                'div',
                { className: 'overflow-hidden' },
                React.createElement(
                    'span',
                    { className: 'font-extrabold text-base tracking-wider bg-gradient-to-r from-cyber-teal via-cyber-blue to-cyber-neon bg-clip-text text-transparent glow-text-teal block' },
                    'RTLGUARD AI'
                ),
                React.createElement('span', { className: 'text-[10px] text-gray-600' }, 'v2.0 • Production')
            )
        ),

        // ── Navigation
        React.createElement(
            'nav',
            { className: 'flex-1 py-4 px-3 space-y-1 overflow-y-auto' },
            menuItems.map(item => {
                const isActive = activeView === item.id;
                return React.createElement(
                    'button',
                    {
                        key: item.id,
                        onClick: () => setView(item.id),
                        className: `w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200 group relative ${
                            isActive
                                ? 'bg-gradient-to-r from-cyber-teal/15 to-cyber-purple/5 text-cyber-teal border border-cyber-teal/25 shadow-[0_0_12px_rgba(0,242,254,0.04)]'
                                : 'text-gray-400 hover:text-white hover:bg-white/5 border border-transparent'
                        }`,
                        title: !sidebarOpen ? item.label : undefined
                    },
                    React.createElement(item.icon, {
                        className: `w-5 h-5 transition-transform group-hover:scale-110 flex-shrink-0 ${
                            isActive ? 'text-cyber-teal' : 'text-gray-400 group-hover:text-cyber-teal'
                        }`
                    }),
                    sidebarOpen && React.createElement(
                        'span',
                        { className: 'font-medium text-sm flex-1 text-left' },
                        item.label
                    ),
                    // Issue badge
                    sidebarOpen && item.badge && React.createElement(
                        'span',
                        { className: `text-[9px] font-bold px-1.5 py-0.5 rounded-full text-white ${item.badgeColor}` },
                        item.badge > 99 ? '99+' : item.badge
                    ),
                    // Collapsed active indicator
                    isActive && !sidebarOpen && React.createElement('div', {
                        className: 'absolute right-0 top-1/4 h-1/2 w-1 bg-cyber-teal rounded-l-md glow-teal'
                    })
                );
            })
        ),

        // ── Footer: Stats + Theme + User + Logout
        React.createElement(
            'div',
            { className: 'p-3 border-t border-white/5 bg-black/20 space-y-3' },

            // Compact issue summary
            sidebarOpen && (totalErrors + totalWarnings > 0) && React.createElement(
                'div',
                { className: 'flex gap-2' },
                totalErrors > 0 && React.createElement(
                    'div',
                    { className: 'flex-1 flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20' },
                    React.createElement(AlertCircle, { className: 'w-3 h-3 text-red-400' }),
                    React.createElement('span', { className: 'text-[10px] text-red-400 font-semibold' }, `${totalErrors} errors`)
                ),
                totalWarnings > 0 && React.createElement(
                    'div',
                    { className: 'flex-1 flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20' },
                    React.createElement(AlertTriangle, { className: 'w-3 h-3 text-amber-400' }),
                    React.createElement('span', { className: 'text-[10px] text-amber-400 font-semibold' }, `${totalWarnings} warns`)
                )
            ),

            // Theme toggle
            sidebarOpen
                ? React.createElement(ThemeToggle, { isDark: theme === 'dark', onToggle: toggleTheme })
                : React.createElement('div', { className: 'flex justify-center' },
                    React.createElement(ThemeToggle, { isDark: theme === 'dark', onToggle: toggleTheme, compact: true })
                  ),

            // User info — click avatar to open Settings
            sidebarOpen
                ? React.createElement(
                    'button',
                    {
                        onClick: () => setView('settings'),
                        className: 'w-full flex items-center gap-3 hover:bg-white/5 rounded-xl p-1.5 transition-all group text-left'
                    },
                    user.avatar
                        ? React.createElement('img', { src: user.avatar, alt: user.name, className: 'w-9 h-9 rounded-full border border-cyber-teal/30 object-cover flex-shrink-0' })
                        : React.createElement('div', { className: 'w-9 h-9 rounded-full bg-gradient-to-br from-cyber-teal to-cyber-blue flex items-center justify-center text-black font-bold text-xs flex-shrink-0 group-hover:ring-2 ring-cyber-teal/40 transition-all' }, userInitials),
                    React.createElement('div', { className: 'overflow-hidden flex-1 text-left' },
                        React.createElement('p', { className: 'font-semibold text-sm truncate text-white group-hover:text-cyber-teal transition-colors' }, user.name),
                        React.createElement('p', { className: 'text-[10px] text-gray-500 truncate' }, user.role)
                    ),
                    React.createElement(Settings, { className: 'w-3.5 h-3.5 text-gray-600 group-hover:text-cyber-teal transition-colors flex-shrink-0' })
                )
                : React.createElement(
                    'button',
                    {
                        onClick: () => setView('settings'),
                        className: 'flex justify-center w-full hover:opacity-80 transition-opacity',
                        title: 'Settings'
                    },
                    user.avatar
                        ? React.createElement('img', { src: user.avatar, alt: user.name, className: 'w-9 h-9 rounded-full border border-cyber-teal/30 object-cover' })
                        : React.createElement('div', { className: 'w-9 h-9 rounded-full bg-gradient-to-br from-cyber-teal to-cyber-blue flex items-center justify-center text-black font-bold text-xs' }, userInitials)
                  ),

            React.createElement(
                'button',
                {
                    onClick: logout,
                    className: 'w-full flex items-center justify-center gap-2 py-2 rounded-xl border border-white/10 hover:border-red-500/30 text-gray-400 hover:text-red-400 hover:bg-red-500/5 transition-all text-xs font-semibold'
                },
                React.createElement(LogOut, { className: 'w-4 h-4' }),
                sidebarOpen && React.createElement('span', null, 'Logout Session')
            )
        ),

        // ── Toggle button
        React.createElement(
            'button',
            {
                onClick: () => setSidebarOpen(!sidebarOpen),
                className: 'absolute -right-3.5 top-24 bg-cyber-dark border border-white/10 w-7 h-7 rounded-full flex items-center justify-center text-gray-400 hover:text-white transition-all hover:border-cyber-teal z-30'
            },
            sidebarOpen
                ? React.createElement(ChevronLeft, { className: 'w-4 h-4' })
                : React.createElement(ChevronRight, { className: 'w-4 h-4' })
        )
    );
}
