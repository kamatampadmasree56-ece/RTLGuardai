import React from 'https://esm.sh/react@18.2.0';

export default function GlassCard({ children, className = '', glow = true }) {
    return React.createElement(
        'div',
        {
            className: `glass-panel ${glow ? 'glass-panel-glow' : ''} rounded-xl p-6 transition-all duration-300 ${className}`
        },
        children
    );
}
