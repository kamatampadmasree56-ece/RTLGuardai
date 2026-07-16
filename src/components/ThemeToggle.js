import React from 'https://esm.sh/react@18.2.0';

/**
 * ThemeToggle — Dark/Light mode toggle button
 */
export default function ThemeToggle({ isDark, onToggle, compact = false }) {
    return React.createElement(
        'button',
        {
            onClick: onToggle,
            title: isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode',
            className: `relative inline-flex items-center gap-2 px-3 py-2 rounded-xl border transition-all duration-300 ${
                isDark
                    ? 'bg-cyber-dark border-white/10 hover:border-cyber-teal text-gray-400 hover:text-cyber-teal'
                    : 'bg-yellow-50 border-yellow-200 text-yellow-600 hover:border-yellow-400'
            } ${compact ? 'px-2 py-2' : ''}`
        },
        React.createElement(
            'div',
            {
                className: `relative w-8 h-4 rounded-full transition-colors duration-300 ${
                    isDark ? 'bg-cyber-teal/20' : 'bg-yellow-300'
                }`
            },
            React.createElement('div', {
                className: `absolute top-0.5 w-3 h-3 rounded-full transition-all duration-300 shadow-md ${
                    isDark
                        ? 'left-0.5 bg-cyber-teal'
                        : 'left-4 bg-white'
                }`
            })
        ),
        !compact && React.createElement(
            'span',
            { className: 'text-xs font-semibold whitespace-nowrap' },
            isDark ? '🌙 Dark' : '☀️ Light'
        )
    );
}
