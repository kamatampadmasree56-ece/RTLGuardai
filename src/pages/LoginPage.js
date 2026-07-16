import React, { useState } from 'https://esm.sh/react@18.2.0';
import { useAppState } from '../utils/appState.js';
import {
    Lock,
    Mail,
    User,
    ShieldCheck,
    Cpu,
    ArrowLeft,
    Loader,
    Wifi,
    WifiOff
} from 'https://esm.sh/lucide-react@0.344.0';

export default function LoginPage() {
    const { login, register, setView, loading, backendOk } = useAppState();

    const [isSignUp, setIsSignUp]   = useState(false);
    const [email, setEmail]         = useState('');
    const [name, setName]           = useState('');
    const [password, setPassword]   = useState('');
    const [role, setRole]           = useState('RTL Design Engineer');
    const [error, setError]         = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        // ── Client-side validation
        if (!email || !password || (isSignUp && !name)) {
            setError('Please fill in all required fields.');
            return;
        }
        if (!email.includes('@') || email.length < 5) {
            setError('Please enter a valid email address.');
            return;
        }
        if (password.length < 6) {
            setError('Password must be at least 6 characters.');
            return;
        }

        // ── Call backend
        let result;
        if (isSignUp) {
            result = await register(name, email, password, role);
        } else {
            result = await login(email, password);
        }

        if (!result.success) {
            setError(result.error || 'Authentication failed. Please try again.');
        }
    };

    const switchMode = (signUp) => {
        setIsSignUp(signUp);
        setError('');
    };

    // Backend status indicator
    const BackendBadge = () => React.createElement(
        'div',
        {
            className: `absolute top-4 right-4 flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-1 rounded-full border ${
                backendOk === true
                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                    : backendOk === false
                        ? 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                        : 'bg-gray-500/10 border-gray-500/20 text-gray-500'
            }`
        },
        React.createElement(backendOk === false ? WifiOff : Wifi, { className: 'w-3 h-3' }),
        backendOk === true ? 'DB Connected'
            : backendOk === false ? 'DB Offline'
                : 'Connecting...'
    );

    return React.createElement(
        'div',
        { className: 'flex-1 flex flex-col items-center justify-center relative bg-cyber-black px-4 py-12' },

        // Background glows
        React.createElement('div', { className: 'absolute inset-0 circuit-grid opacity-30 pointer-events-none' }),
        React.createElement('div', { className: 'absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-cyber-teal/10 rounded-full blur-[100px] pointer-events-none' }),
        React.createElement('div', { className: 'absolute bottom-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-cyber-purple/10 rounded-full blur-[100px] pointer-events-none' }),

        // Back button
        React.createElement(
            'button',
            {
                onClick: () => setView('landing'),
                className: 'absolute top-8 left-8 flex items-center gap-2 text-sm text-gray-500 hover:text-cyber-teal transition-colors duration-200 group'
            },
            React.createElement(ArrowLeft, { className: 'w-4 h-4 transition-transform group-hover:-translate-x-1' }),
            'Exit to Terminal'
        ),

        // Form container
        React.createElement(
            'div',
            { className: 'w-full max-w-md relative z-10' },

            // Header
            React.createElement(
                'div',
                { className: 'flex flex-col items-center mb-8' },
                React.createElement(
                    'div',
                    { className: 'p-3 bg-gradient-to-tr from-cyber-teal to-cyber-purple rounded-2xl flex items-center justify-center glow-teal mb-4' },
                    React.createElement(Cpu, { className: 'w-8 h-8 text-white' })
                ),
                React.createElement('h2', { className: 'text-2xl font-bold text-white tracking-wide' }, 'Access RTLGuard AI'),
                React.createElement('p', { className: 'text-gray-500 text-sm mt-1' }, 'Secure Silicon Design Verification Environment')
            ),

            // Glass panel
            React.createElement(
                'div',
                { className: 'glass-panel rounded-2xl p-8 border border-white/5 shadow-2xl relative overflow-hidden' },

                // Decorative top line
                React.createElement('div', { className: 'absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-cyber-teal to-transparent opacity-50' }),

                // Backend status badge
                React.createElement(BackendBadge),

                // Auth tabs
                React.createElement(
                    'div',
                    { className: 'flex rounded-lg bg-black/40 p-1 mb-8 border border-white/5' },
                    React.createElement(
                        'button',
                        {
                            onClick: () => switchMode(false),
                            className: `flex-1 py-2 text-sm font-semibold rounded-md transition-all duration-200 ${
                                !isSignUp ? 'bg-cyber-teal/15 text-cyber-teal border border-cyber-teal/20' : 'text-gray-400 hover:text-white'
                            }`
                        },
                        'Sign In'
                    ),
                    React.createElement(
                        'button',
                        {
                            onClick: () => switchMode(true),
                            className: `flex-1 py-2 text-sm font-semibold rounded-md transition-all duration-200 ${
                                isSignUp ? 'bg-cyber-teal/15 text-cyber-teal border border-cyber-teal/20' : 'text-gray-400 hover:text-white'
                            }`
                        },
                        'Register Node'
                    )
                ),

                // Offline warning
                backendOk === false && React.createElement(
                    'div',
                    { className: 'px-4 py-3 rounded-lg border border-amber-500/20 bg-amber-500/5 text-amber-400 text-xs font-medium mb-4 flex items-start gap-2' },
                    React.createElement(WifiOff, { className: 'w-4 h-4 flex-shrink-0 mt-0.5' }),
                    React.createElement(
                        'span',
                        null,
                        'Backend server is not running. Start it with: ',
                        React.createElement('code', { className: 'font-mono text-amber-300' }, 'python run_server.py'),
                        ' — or data will not be saved.'
                    )
                ),

                // Error
                error && React.createElement(
                    'div',
                    { className: 'px-4 py-3 rounded-lg border border-red-500/20 bg-red-500/5 text-red-400 text-xs font-medium mb-6' },
                    error
                ),

                // Form
                React.createElement(
                    'form',
                    { onSubmit: handleSubmit, className: 'space-y-5' },

                    // Name field (sign-up only)
                    isSignUp && React.createElement(
                        'div',
                        null,
                        React.createElement('label', { className: 'block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wide' }, 'Full Name'),
                        React.createElement(
                            'div',
                            { className: 'relative' },
                            React.createElement(User, { className: 'absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500' }),
                            React.createElement('input', {
                                type: 'text',
                                placeholder: 'e.g. Dr. John Doe',
                                value: name,
                                onChange: (e) => setName(e.target.value),
                                className: 'w-full pl-10 pr-4 py-3 bg-black/50 border border-white/10 hover:border-white/20 focus:border-cyber-teal focus:ring-1 focus:ring-cyber-teal rounded-xl text-sm text-white placeholder-gray-600 outline-none transition-all'
                            })
                        )
                    ),

                    // Role field (sign-up only)
                    isSignUp && React.createElement(
                        'div',
                        null,
                        React.createElement('label', { className: 'block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wide' }, 'Engineering Role'),
                        React.createElement(
                            'select',
                            {
                                value: role,
                                onChange: (e) => setRole(e.target.value),
                                className: 'w-full px-4 py-3 bg-black/50 border border-white/10 hover:border-white/20 focus:border-cyber-teal focus:ring-1 focus:ring-cyber-teal rounded-xl text-sm text-white outline-none transition-all'
                            },
                            ['RTL Design Engineer', 'Lead RTL Architecture Engineer', 'Verification Engineer', 'VLSI Design Engineer', 'FPGA Engineer', 'Security Researcher'].map(r =>
                                React.createElement('option', { key: r, value: r }, r)
                            )
                        )
                    ),

                    // Email field
                    React.createElement(
                        'div',
                        null,
                        React.createElement('label', { className: 'block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wide' }, 'Corporate Email ID'),
                        React.createElement(
                            'div',
                            { className: 'relative' },
                            React.createElement(Mail, { className: 'absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500' }),
                            React.createElement('input', {
                                type: 'email',
                                placeholder: 'engineer@semicon.io',
                                value: email,
                                onChange: (e) => setEmail(e.target.value),
                                className: 'w-full pl-10 pr-4 py-3 bg-black/50 border border-white/10 hover:border-white/20 focus:border-cyber-teal focus:ring-1 focus:ring-cyber-teal rounded-xl text-sm text-white placeholder-gray-600 outline-none transition-all'
                            })
                        )
                    ),

                    // Password field
                    React.createElement(
                        'div',
                        null,
                        React.createElement('label', { className: 'block text-xs font-semibold text-gray-400 mb-1.5 uppercase tracking-wide' }, 'Access Token / Password'),
                        React.createElement(
                            'div',
                            { className: 'relative' },
                            React.createElement(Lock, { className: 'absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500' }),
                            React.createElement('input', {
                                type: 'password',
                                placeholder: '••••••••',
                                value: password,
                                onChange: (e) => setPassword(e.target.value),
                                className: 'w-full pl-10 pr-4 py-3 bg-black/50 border border-white/10 hover:border-white/20 focus:border-cyber-teal focus:ring-1 focus:ring-cyber-teal rounded-xl text-sm text-white placeholder-gray-600 outline-none transition-all'
                            })
                        )
                    ),

                    // Submit button
                    React.createElement(
                        'button',
                        {
                            type: 'submit',
                            disabled: loading,
                            className: `w-full py-3.5 font-extrabold rounded-xl text-sm flex items-center justify-center gap-2 transition-all duration-200 mt-8 ${
                                loading
                                    ? 'bg-cyber-teal/30 text-cyber-teal cursor-not-allowed border border-cyber-teal/30'
                                    : 'bg-gradient-to-r from-cyber-teal to-cyber-blue text-cyber-black shadow-[0_0_20px_rgba(0,242,254,0.2)] hover:shadow-[0_0_25px_rgba(0,242,254,0.35)] hover:scale-[1.02]'
                            }`
                        },
                        loading
                            ? React.createElement(Loader, { className: 'w-4 h-4 animate-spin' })
                            : React.createElement(ShieldCheck, { className: 'w-4 h-4' }),
                        loading
                            ? 'Authenticating...'
                            : isSignUp ? 'Provision Secure Node' : 'Authenticate Credentials'
                    )
                )
            ),

            // Footer note
            React.createElement(
                'p',
                { className: 'text-center text-xs text-gray-500 mt-6' },
                'By authenticating, you agree to comply with semiconductor export control laws and internal IP protection regulations.'
            )
        )
    );
}
