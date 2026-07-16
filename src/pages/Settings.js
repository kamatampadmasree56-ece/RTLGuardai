import React, { useState, useEffect } from 'https://esm.sh/react@18.2.0';
import { useAppState } from '../utils/appState.js';
import GlassCard from '../components/GlassCard.js';
import {
    User, Mail, Briefcase, Moon, Sun, Key,
    Save, LogOut, Trash2, Check, AlertCircle,
    Loader, Eye, EyeOff, Database
} from 'https://esm.sh/lucide-react@0.344.0';

const ROLES = [
    'RTL Design Engineer',
    'Lead RTL Architecture Engineer',
    'Verification Engineer',
    'VLSI Design Engineer',
    'FPGA Engineer',
    'Security Researcher',
    'Chip Architect',
    'Physical Design Engineer',
];

function SectionHeader({ icon: Icon, title, subtitle }) {
    return React.createElement(
        'div',
        { className: 'flex items-center gap-3 mb-5' },
        React.createElement('div', { className: 'p-2 rounded-xl bg-cyber-teal/10 border border-cyber-teal/20' },
            React.createElement(Icon, { className: 'w-4 h-4 text-cyber-teal' })
        ),
        React.createElement('div', null,
            React.createElement('h3', { className: 'text-sm font-bold text-white' }, title),
            subtitle && React.createElement('p', { className: 'text-[11px] text-gray-500 mt-0.5' }, subtitle)
        )
    );
}

function Field({ label, children }) {
    return React.createElement(
        'div',
        { className: 'space-y-1.5' },
        React.createElement('label', { className: 'block text-xs font-semibold text-gray-400 uppercase tracking-wide' }, label),
        children
    );
}

export default function Settings() {
    const { user, updateProfile, toggleTheme, theme, logout, loading, backendOk } = useAppState();

    const [name, setName]       = useState(user?.name || '');
    const [role, setRole]       = useState(user?.role || 'RTL Design Engineer');
    const [saved, setSaved]     = useState(false);
    const [saveErr, setSaveErr] = useState('');
    const [saving, setSaving]   = useState(false);

    const [geminiKey, setGeminiKey] = useState(() => localStorage.getItem('rtlguard_gemini_key') || '');
    const [showKey, setShowKey]     = useState(false);
    const [keySaved, setKeySaved]   = useState(false);

    useEffect(() => {
        if (user) {
            setName(user.name || '');
            setRole(user.role || 'RTL Design Engineer');
        }
    }, [user?.userId]);

    const handleSaveProfile = async () => {
        if (!name.trim()) { setSaveErr('Name cannot be empty'); return; }
        setSaveErr('');
        setSaving(true);
        const result = await updateProfile({ name: name.trim(), role });
        setSaving(false);
        if (result.success) {
            setSaved(true);
            setTimeout(() => setSaved(false), 2500);
        } else {
            setSaveErr(result.error || 'Failed to save profile');
        }
    };

    const handleSaveGeminiKey = () => {
        localStorage.setItem('rtlguard_gemini_key', geminiKey.trim());
        setKeySaved(true);
        setTimeout(() => setKeySaved(false), 2500);
    };

    const handleClearLocalData = () => {
        if (!window.confirm('Clear all local session data and cached preferences? You will be logged out.')) return;
        localStorage.clear();
        window.location.reload();
    };

    const userInitials = (user?.name || 'U').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

    return React.createElement(
        'div',
        { className: 'flex-1 p-6 space-y-6 bg-cyber-black overflow-y-auto max-h-[calc(100vh-80px)]' },

        // Page Header
        React.createElement(
            'div',
            { className: 'border-b border-white/5 pb-5' },
            React.createElement('h1', {
                className: 'text-2xl font-extrabold tracking-wider bg-gradient-to-r from-cyber-teal via-cyber-blue to-cyber-neon bg-clip-text text-transparent glow-text-teal'
            }, 'SETTINGS & PROFILE'),
            React.createElement('p', { className: 'text-xs text-gray-500 mt-1' },
                'Manage your account, appearance, and integration credentials.'
            )
        ),

        // Main grid
        React.createElement(
            'div',
            { className: 'grid grid-cols-1 lg:grid-cols-3 gap-6' },

            // Left: Avatar + Stats
            React.createElement(
                'div',
                { className: 'lg:col-span-1 space-y-4' },

                React.createElement(
                    GlassCard,
                    null,
                    React.createElement(
                        'div',
                        { className: 'flex flex-col items-center py-4 gap-4' },
                        React.createElement(
                            'div',
                            { className: 'w-24 h-24 rounded-2xl bg-gradient-to-br from-cyber-teal to-cyber-purple flex items-center justify-center glow-teal text-3xl font-black text-white relative select-none' },
                            userInitials,
                            React.createElement('div', {
                                className: `absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-cyber-black ${backendOk ? 'bg-emerald-400' : 'bg-rose-400'}`
                            })
                        ),
                        React.createElement('div', { className: 'text-center' },
                            React.createElement('h2', { className: 'text-base font-bold text-white' }, user?.name || 'User'),
                            React.createElement('p', { className: 'text-xs text-cyber-teal mt-0.5' }, user?.role || 'Engineer'),
                            React.createElement('p', { className: 'text-[11px] text-gray-500 mt-1' }, user?.email || '')
                        ),
                        React.createElement(
                            'div',
                            { className: `flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-semibold ${backendOk ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'}` },
                            React.createElement('div', { className: `w-1.5 h-1.5 rounded-full ${backendOk ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'}` }),
                            backendOk ? 'MongoDB Connected' : 'Database Offline'
                        )
                    )
                ),

                React.createElement(
                    GlassCard,
                    null,
                    React.createElement(SectionHeader, { icon: Database, title: 'Session Info' }),
                    React.createElement(
                        'div',
                        { className: 'space-y-2' },
                        [
                            { label: 'User ID', value: (user?.userId || '—').slice(0, 16) + '…' },
                            { label: 'Theme', value: theme === 'dark' ? '🌙 Dark Mode' : '☀️ Light Mode' },
                            { label: 'Backend', value: backendOk ? 'Online ✓' : 'Offline ✗' },
                            { label: 'Gemini Key', value: geminiKey ? '✓ Configured' : '✗ Not set' },
                        ].map(({ label, value }) =>
                            React.createElement(
                                'div',
                                { key: label, className: 'flex items-center justify-between py-1.5 border-b border-white/5 last:border-0' },
                                React.createElement('span', { className: 'text-xs text-gray-500' }, label),
                                React.createElement('span', { className: 'text-xs font-mono text-gray-300' }, value)
                            )
                        )
                    )
                )
            ),

            // Right: Settings panels
            React.createElement(
                'div',
                { className: 'lg:col-span-2 space-y-5' },

                // Profile Settings
                React.createElement(
                    GlassCard,
                    null,
                    React.createElement(SectionHeader, { icon: User, title: 'Profile Information', subtitle: 'Update your display name and engineering role' }),
                    React.createElement(
                        'div',
                        { className: 'space-y-4' },

                        React.createElement(
                            Field,
                            { label: 'Full Name' },
                            React.createElement(
                                'div',
                                { className: 'relative' },
                                React.createElement(User, { className: 'absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500' }),
                                React.createElement('input', {
                                    type: 'text',
                                    value: name,
                                    onChange: e => setName(e.target.value),
                                    className: 'w-full pl-10 pr-4 py-2.5 bg-black/40 border border-white/10 hover:border-white/20 focus:border-cyber-teal focus:ring-1 focus:ring-cyber-teal rounded-xl text-sm text-white placeholder-gray-600 outline-none transition-all',
                                    placeholder: 'Your full name'
                                })
                            )
                        ),

                        React.createElement(
                            Field,
                            { label: 'Engineering Role' },
                            React.createElement(
                                'div',
                                { className: 'relative' },
                                React.createElement(Briefcase, { className: 'absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none' }),
                                React.createElement(
                                    'select',
                                    {
                                        value: role,
                                        onChange: e => setRole(e.target.value),
                                        className: 'w-full pl-10 pr-4 py-2.5 bg-black/40 border border-white/10 hover:border-white/20 focus:border-cyber-teal focus:ring-1 focus:ring-cyber-teal rounded-xl text-sm text-white outline-none transition-all appearance-none'
                                    },
                                    ROLES.map(r => React.createElement('option', { key: r, value: r, className: 'bg-gray-900' }, r))
                                )
                            )
                        ),

                        React.createElement(
                            Field,
                            { label: 'Email (Read-Only)' },
                            React.createElement(
                                'div',
                                { className: 'relative' },
                                React.createElement(Mail, { className: 'absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-600' }),
                                React.createElement('input', {
                                    type: 'email',
                                    value: user?.email || '',
                                    readOnly: true,
                                    className: 'w-full pl-10 pr-4 py-2.5 bg-black/20 border border-white/5 rounded-xl text-sm text-gray-500 outline-none cursor-not-allowed'
                                })
                            )
                        ),

                        saveErr && React.createElement(
                            'div',
                            { className: 'flex items-center gap-2 text-xs text-red-400 bg-red-500/5 border border-red-500/20 px-3 py-2 rounded-lg' },
                            React.createElement(AlertCircle, { className: 'w-3.5 h-3.5 flex-shrink-0' }),
                            saveErr
                        ),

                        React.createElement(
                            'div',
                            { className: 'flex items-center gap-3 pt-2' },
                            React.createElement(
                                'button',
                                {
                                    onClick: handleSaveProfile,
                                    disabled: saving || !backendOk,
                                    className: `flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${saving || !backendOk ? 'bg-white/5 text-gray-500 cursor-not-allowed' : saved ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-gradient-to-r from-cyber-teal to-cyber-blue text-black hover:opacity-90 active:scale-95'}`
                                },
                                saving
                                    ? React.createElement(Loader, { className: 'w-3.5 h-3.5 animate-spin' })
                                    : saved
                                        ? React.createElement(Check, { className: 'w-3.5 h-3.5' })
                                        : React.createElement(Save, { className: 'w-3.5 h-3.5' }),
                                saved ? 'Profile Saved!' : saving ? 'Saving…' : 'Save Profile'
                            ),
                            !backendOk && React.createElement('span', { className: 'text-[11px] text-amber-500' }, 'Backend offline — profile update unavailable')
                        )
                    )
                ),

                // Appearance
                React.createElement(
                    GlassCard,
                    null,
                    React.createElement(SectionHeader, { icon: Moon, title: 'Appearance', subtitle: 'Switch between dark and light themes' }),
                    React.createElement(
                        'div',
                        { className: 'flex items-center justify-between mb-4' },
                        React.createElement('div', null,
                            React.createElement('p', { className: 'text-sm font-semibold text-white' },
                                theme === 'dark' ? '🌙 Dark Mode Active' : '☀️ Light Mode Active'
                            ),
                            React.createElement('p', { className: 'text-xs text-gray-500 mt-0.5' },
                                theme === 'dark' ? 'Optimized for low-light engineering environments' : 'High-contrast mode for bright environments'
                            )
                        ),
                        React.createElement(
                            'button',
                            {
                                onClick: toggleTheme,
                                className: `relative inline-flex h-7 w-14 items-center rounded-full transition-colors duration-300 focus:outline-none ${theme === 'dark' ? 'bg-cyber-teal/30 border border-cyber-teal/40' : 'bg-amber-400/30 border border-amber-400/40'}`
                            },
                            React.createElement('span', {
                                className: `inline-flex h-5 w-5 transform rounded-full transition-transform duration-300 items-center justify-center ${theme === 'dark' ? 'translate-x-1 bg-cyber-teal' : 'translate-x-8 bg-amber-400'}`
                            },
                                theme === 'dark'
                                    ? React.createElement(Moon, { className: 'w-3 h-3 text-black' })
                                    : React.createElement(Sun, { className: 'w-3 h-3 text-black' })
                            )
                        )
                    ),
                    React.createElement(
                        'div',
                        { className: 'grid grid-cols-2 gap-3' },
                        [
                            { id: 'dark',  label: '🌙 Dark',  bg: 'bg-[#030712]', textCls: 'text-gray-400', barCls: 'bg-cyber-teal/40', bar2: 'bg-white/10', activeBorder: 'border-cyber-teal shadow-[0_0_12px_rgba(0,242,254,0.2)]' },
                            { id: 'light', label: '☀️ Light', bg: 'bg-gray-100',   textCls: 'text-gray-600', barCls: 'bg-amber-400/60', bar2: 'bg-gray-400/30', activeBorder: 'border-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.2)]' },
                        ].map(t =>
                            React.createElement(
                                'div',
                                {
                                    key: t.id,
                                    onClick: () => { if (theme !== t.id) toggleTheme(); },
                                    className: `${t.bg} border-2 rounded-xl p-3 cursor-pointer transition-all hover:scale-[1.02] ${theme === t.id ? t.activeBorder : 'border-white/10'}`
                                },
                                React.createElement('div', { className: `h-3 w-12 rounded ${t.barCls} mb-1.5` }),
                                React.createElement('div', { className: `h-2 w-20 rounded ${t.bar2} mb-1` }),
                                React.createElement('div', { className: `h-2 w-14 rounded ${t.bar2}` }),
                                React.createElement('p', { className: `text-[10px] font-semibold mt-2 ${t.textCls}` }, t.label),
                                theme === t.id && React.createElement('div', { className: 'flex items-center gap-1 mt-1' },
                                    React.createElement(Check, { className: `w-3 h-3 ${t.id === 'dark' ? 'text-cyber-teal' : 'text-amber-500'}` }),
                                    React.createElement('span', { className: `text-[9px] ${t.id === 'dark' ? 'text-cyber-teal' : 'text-amber-500'}` }, 'Active')
                                )
                            )
                        )
                    )
                ),

                // Gemini API Key
                React.createElement(
                    GlassCard,
                    null,
                    React.createElement(SectionHeader, {
                        icon: Key,
                        title: 'Gemini AI Integration',
                        subtitle: 'Configure your Gemini API key to enable AI-powered explanations and chat'
                    }),
                    React.createElement(
                        'div',
                        { className: 'space-y-3' },
                        React.createElement('div', { className: 'relative' },
                            React.createElement(Key, { className: 'absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500' }),
                            React.createElement('input', {
                                type: showKey ? 'text' : 'password',
                                value: geminiKey,
                                onChange: e => setGeminiKey(e.target.value),
                                placeholder: 'AIza...',
                                className: 'w-full pl-10 pr-12 py-2.5 bg-black/40 border border-white/10 hover:border-white/20 focus:border-cyber-purple focus:ring-1 focus:ring-cyber-purple rounded-xl text-sm text-white font-mono placeholder-gray-600 outline-none transition-all'
                            }),
                            React.createElement(
                                'button',
                                {
                                    onClick: () => setShowKey(v => !v),
                                    className: 'absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors'
                                },
                                React.createElement(showKey ? EyeOff : Eye, { className: 'w-4 h-4' })
                            )
                        ),
                        React.createElement('p', { className: 'text-[11px] text-gray-500' },
                            'Key is stored in your browser\'s localStorage only — never sent to our servers. Get your free key at ',
                            React.createElement('a', {
                                href: 'https://aistudio.google.com/app/apikey',
                                target: '_blank',
                                rel: 'noreferrer',
                                className: 'text-cyber-purple hover:underline'
                            }, 'aistudio.google.com'),
                            '.'
                        ),
                        React.createElement(
                            'button',
                            {
                                onClick: handleSaveGeminiKey,
                                className: `flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${keySaved ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-cyber-purple/20 text-cyber-purple border border-cyber-purple/30 hover:bg-cyber-purple/30 active:scale-95'}`
                            },
                            React.createElement(keySaved ? Check : Key, { className: 'w-3.5 h-3.5' }),
                            keySaved ? 'Key Saved to Browser!' : 'Save API Key Locally'
                        )
                    )
                ),

                // Danger Zone
                React.createElement(
                    'div',
                    { className: 'glass-panel rounded-2xl p-5 border border-red-500/20 bg-red-500/5' },
                    React.createElement(SectionHeader, {
                        icon: AlertCircle,
                        title: 'Danger Zone',
                        subtitle: 'Irreversible actions — proceed with caution'
                    }),
                    React.createElement(
                        'div',
                        { className: 'space-y-3' },

                        React.createElement(
                            'div',
                            { className: 'flex items-center justify-between p-3 bg-black/30 rounded-xl border border-white/5' },
                            React.createElement('div', null,
                                React.createElement('p', { className: 'text-sm font-semibold text-white' }, 'Clear Local Data'),
                                React.createElement('p', { className: 'text-[11px] text-gray-500 mt-0.5' }, 'Wipe session, preferences, and cached keys from this browser')
                            ),
                            React.createElement(
                                'button',
                                {
                                    onClick: handleClearLocalData,
                                    className: 'flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold text-amber-400 border border-amber-500/30 hover:bg-amber-500/10 transition-all active:scale-95'
                                },
                                React.createElement(Trash2, { className: 'w-3.5 h-3.5' }),
                                'Clear'
                            )
                        ),

                        React.createElement(
                            'div',
                            { className: 'flex items-center justify-between p-3 bg-black/30 rounded-xl border border-white/5' },
                            React.createElement('div', null,
                                React.createElement('p', { className: 'text-sm font-semibold text-white' }, 'Sign Out'),
                                React.createElement('p', { className: 'text-[11px] text-gray-500 mt-0.5' }, 'Log out of your RTLGuard AI session on this device')
                            ),
                            React.createElement(
                                'button',
                                {
                                    onClick: logout,
                                    className: 'flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold text-red-400 border border-red-500/30 hover:bg-red-500/10 transition-all active:scale-95'
                                },
                                React.createElement(LogOut, { className: 'w-3.5 h-3.5' }),
                                'Sign Out'
                            )
                        )
                    )
                )
            )
        )
    );
}
