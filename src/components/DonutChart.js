import React from 'https://esm.sh/react@18.2.0';

/**
 * DonutChart — SVG animated donut chart
 * Props: percentage (0-100), size, strokeWidth, color, label, sublabel
 */
export default function DonutChart({
    percentage = 0,
    size = 120,
    strokeWidth = 10,
    color = '#00f2fe',
    trackColor = 'rgba(255,255,255,0.05)',
    label = '',
    sublabel = '',
    animated = true
}) {
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (percentage / 100) * circumference;
    const cx = size / 2;
    const cy = size / 2;

    return React.createElement(
        'div',
        { className: 'flex flex-col items-center gap-2' },
        React.createElement(
            'div',
            { className: 'relative', style: { width: size, height: size } },
            React.createElement(
                'svg',
                { width: size, height: size, viewBox: `0 0 ${size} ${size}` },
                // Track ring
                React.createElement('circle', {
                    cx, cy, r: radius,
                    fill: 'none',
                    stroke: trackColor,
                    strokeWidth
                }),
                // Glow filter
                React.createElement('defs', null,
                    React.createElement('filter', { id: `glow-${label}` },
                        React.createElement('feGaussianBlur', { stdDeviation: '2', result: 'coloredBlur' }),
                        React.createElement('feMerge', null,
                            React.createElement('feMergeNode', { in: 'coloredBlur' }),
                            React.createElement('feMergeNode', { in: 'SourceGraphic' })
                        )
                    )
                ),
                // Progress ring
                React.createElement('circle', {
                    cx, cy, r: radius,
                    fill: 'none',
                    stroke: color,
                    strokeWidth,
                    strokeLinecap: 'round',
                    strokeDasharray: circumference,
                    strokeDashoffset: offset,
                    transform: `rotate(-90 ${cx} ${cy})`,
                    filter: `url(#glow-${label})`,
                    style: animated ? {
                        transition: 'stroke-dashoffset 1.4s cubic-bezier(0.4,0,0.2,1)',
                    } : {}
                })
            ),
            // Center label
            React.createElement(
                'div',
                {
                    className: 'absolute inset-0 flex flex-col items-center justify-center',
                },
                React.createElement(
                    'span',
                    { className: 'text-xl font-black', style: { color } },
                    `${percentage}%`
                )
            )
        ),
        label && React.createElement(
            'div',
            { className: 'text-center' },
            React.createElement('p', { className: 'text-xs font-semibold text-white' }, label),
            sublabel && React.createElement('p', { className: 'text-[10px] text-gray-500 mt-0.5' }, sublabel)
        )
    );
}
