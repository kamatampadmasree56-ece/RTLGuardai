import React, { useEffect, useRef } from 'https://esm.sh/react@18.2.0';
import { useAppState } from '../utils/appState.js';
import { 
    Cpu, 
    ShieldAlert, 
    Zap, 
    Activity, 
    Terminal, 
    LineChart,
    ChevronRight,
    ArrowUpRight
} from 'https://esm.sh/lucide-react@0.344.0';

export default function LandingPage() {
    const { setView, user } = useAppState();
    const canvasRef = useRef(null);

    // Semiconductor circuit trace canvas animation
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        
        let animationFrameId;
        let width = (canvas.width = canvas.offsetWidth);
        let height = (canvas.height = canvas.offsetHeight);

        const handleResize = () => {
            width = canvas.width = canvas.offsetWidth;
            height = canvas.height = canvas.offsetHeight;
        };
        window.addEventListener('resize', handleResize);

        // Nodes & Traces definition
        const nodes = [];
        const traces = [];
        const gridSize = 40;

        // Generate static semiconductor grid nodes
        for (let x = 0; x < width; x += gridSize) {
            for (let y = 0; y < height; y += gridSize) {
                if (Math.random() < 0.15) {
                    nodes.push({ x, y, size: Math.random() * 2 + 1, pulse: Math.random() });
                }
            }
        }

        // Active pulses traveling
        const pulses = [];
        const maxPulses = 12;

        class Pulse {
            constructor() {
                this.reset();
            }

            reset() {
                this.x = Math.floor(Math.random() * (width / gridSize)) * gridSize;
                this.y = Math.floor(Math.random() * (height / gridSize)) * gridSize;
                this.dx = 0;
                this.dy = 0;
                this.speed = 3;
                this.length = Math.random() * 100 + 40;
                this.history = [];
                this.color = Math.random() > 0.5 ? '#00f2fe' : '#7f00ff';
                
                // Set initial direction
                this.pickDirection();
            }

            pickDirection() {
                const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];
                const dir = dirs[Math.floor(Math.random() * dirs.length)];
                this.dx = dir[0] * this.speed;
                this.dy = dir[1] * this.speed;
                this.steps = Math.floor(Math.random() * 10 + 5) * (gridSize / this.speed);
            }

            update() {
                this.history.push({ x: this.x, y: this.y });
                if (this.history.length > 25) {
                    this.history.shift();
                }

                this.x += this.dx;
                this.y += this.dy;
                this.steps--;

                // Wrap around edges
                if (this.x < 0 || this.x > width || this.y < 0 || this.y > height) {
                    this.reset();
                }

                // Pick new direction occasionally
                if (this.steps <= 0) {
                    this.pickDirection();
                }
            }

            draw() {
                if (this.history.length < 2) return;
                ctx.beginPath();
                ctx.moveTo(this.history[0].x, this.history[0].y);
                for (let i = 1; i < this.history.length; i++) {
                    ctx.lineTo(this.history[i].x, this.history[i].y);
                }
                ctx.strokeStyle = this.color;
                ctx.lineWidth = 1.5;
                ctx.shadowBlur = 10;
                ctx.shadowColor = this.color;
                ctx.stroke();
                ctx.shadowBlur = 0; // Reset shadow
            }
        }

        // Initialize pulses
        for (let i = 0; i < maxPulses; i++) {
            pulses.push(new Pulse());
        }

        const render = () => {
            // Dark overlay to fade trails slightly
            ctx.fillStyle = 'rgba(3, 7, 18, 0.15)';
            ctx.fillRect(0, 0, width, height);

            // Draw grid lines
            ctx.strokeStyle = 'rgba(0, 242, 254, 0.02)';
            ctx.lineWidth = 0.5;
            for (let x = 0; x < width; x += gridSize) {
                ctx.beginPath();
                ctx.moveTo(x, 0);
                ctx.lineTo(x, height);
                ctx.stroke();
            }
            for (let y = 0; y < height; y += gridSize) {
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(width, y);
                ctx.stroke();
            }

            // Draw stationary nodes
            nodes.forEach(node => {
                node.pulse += 0.01;
                const radius = node.size * (1 + Math.sin(node.pulse) * 0.3);
                ctx.beginPath();
                ctx.arc(node.x, node.y, radius, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(0, 242, 254, 0.2)';
                ctx.fill();
            });

            // Draw active pulses
            pulses.forEach(pulse => {
                pulse.update();
                pulse.draw();
            });

            animationFrameId = requestAnimationFrame(render);
        };

        render();

        return () => {
            cancelAnimationFrame(animationFrameId);
            window.removeEventListener('resize', handleResize);
        };
    }, []);

    const features = [
        {
            title: "Automated Verilog Linting",
            description: "Detect timing loops, latch inferences, and synchronization race conditions automatically during editing.",
            icon: Cpu,
            color: "text-cyber-teal border-cyber-teal/30 bg-cyber-teal/5"
        },
        {
            title: "Hardware Trojan Checker",
            description: "Scan code nets for backdoor trigger signals and access bypasses that compromise hardware security boundaries.",
            icon: ShieldAlert,
            color: "text-cyber-neon border-cyber-neon/30 bg-cyber-neon/5"
        },
        {
            title: "RTL Quality Scoring",
            description: "Get granular modular scores across quality, performance, security, and maintainability for every compile run.",
            icon: LineChart,
            color: "text-cyber-blue border-cyber-blue/30 bg-cyber-blue/5"
        },
        {
            title: "CDC Synchronization Audit",
            description: "Track unsynchronized ports across clock domain boundaries and secure async reset domains automatically.",
            icon: Activity,
            color: "text-cyber-purple border-cyber-purple/30 bg-cyber-purple/5"
        }
    ];

    const handleCTA = () => {
        if (user) {
            setView('dashboard');
        } else {
            setView('login');
        }
    };

    return React.createElement(
        'div',
        { className: 'flex-1 flex flex-col relative bg-cyber-black' },
        
        // Background Animation
        React.createElement('canvas', {
            ref: canvasRef,
            className: 'absolute inset-0 w-full h-full pointer-events-none z-0'
        }),

        // Overlay mask
        React.createElement('div', {
            className: 'absolute inset-0 bg-gradient-to-b from-transparent via-cyber-black/40 to-cyber-black pointer-events-none z-0'
        }),

        // Main Hero Section
        React.createElement(
            'section',
            { className: 'max-w-7xl mx-auto px-8 pt-32 pb-24 text-center flex-1 flex flex-col justify-center items-center relative z-10' },
            
            // Neon Badge
            React.createElement(
                'div',
                { className: 'inline-flex items-center gap-2 px-3 py-1 rounded-full border border-cyber-teal/40 bg-cyber-teal/5 text-cyber-teal text-xs font-semibold uppercase tracking-wider mb-6 animate-pulse' },
                React.createElement(Terminal, { className: 'w-3.5 h-3.5' }),
                'Next-Gen RTL Design Auditing is Here'
            ),

            // Hero Headline
            React.createElement(
                'h1',
                { className: 'text-5xl md:text-7xl font-extrabold tracking-tight mb-8 max-w-4xl text-white' },
                'Hardware Security & Linting Powered by ',
                React.createElement(
                    'span',
                    { className: 'bg-gradient-to-r from-cyber-teal via-cyber-blue to-cyber-purple bg-clip-text text-transparent glow-text-teal' },
                    'RTLGuard AI'
                )
            ),

            // Subtitle description
            React.createElement(
                'p',
                { className: 'text-gray-400 text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed' },
                'Verify silicon designs instantly. Catch clock domain crossing bugs, secure hardware registers from Trojans, and optimize RTL logic using static code analysis.'
            ),

            // CTA Buttons
            React.createElement(
                'div',
                { className: 'flex flex-col sm:flex-row gap-4 mb-24' },
                React.createElement(
                    'button',
                    {
                        onClick: handleCTA,
                        className: 'neon-btn px-8 py-4 bg-gradient-to-r from-cyber-teal to-cyber-blue text-cyber-black font-bold rounded-xl flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(0,242,254,0.3)] hover:scale-105 transition-transform'
                    },
                    user ? 'Go to Dashboard' : 'Initialize Session',
                    React.createElement(ChevronRight, { className: 'w-5 h-5' })
                ),
                React.createElement(
                    'button',
                    {
                        onClick: () => setView('about'),
                        className: 'px-8 py-4 bg-white/5 border border-white/10 hover:border-cyber-teal text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-all duration-200'
                    },
                    'Explore Engine Architecture',
                    React.createElement(ArrowUpRight, { className: 'w-4 h-4' })
                )
            ),

            // Features Grid
            React.createElement(
                'div',
                { className: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 w-full max-w-7xl mb-24' },
                features.map((feature, i) => React.createElement(
                    'div',
                    {
                        key: i,
                        className: 'glass-panel rounded-2xl p-6 border border-white/5 hover:border-cyber-teal/30 transition-all duration-300 text-left hover:-translate-y-1 hover:shadow-[0_0_20px_rgba(0,242,254,0.05)]'
                    },
                    React.createElement(
                        'div',
                        { className: `w-12 h-12 rounded-xl border flex items-center justify-center mb-5 ${feature.color}` },
                        React.createElement(feature.icon, { className: 'w-6 h-6' })
                    ),
                    React.createElement('h3', { className: 'font-bold text-lg mb-2 text-white' }, feature.title),
                    React.createElement('p', { className: 'text-gray-400 text-sm leading-relaxed' }, feature.description)
                ))
            ),

            // Statistics Board
            React.createElement(
                'div',
                { className: 'w-full glass-panel border border-white/5 rounded-2xl p-8 grid grid-cols-2 md:grid-cols-4 gap-8 divide-y md:divide-y-0 md:divide-x divide-white/5' },
                [
                    { count: '1.4M+', label: 'Lines of RTL Audited' },
                    { count: '99.4%', label: 'Silicon Synthesis Match' },
                    { count: '15.2k', label: 'Hardware Trojan Blocked' },
                    { count: '0ms', label: 'Analysis Execution Latency' }
                ].map((stat, i) => React.createElement(
                    'div',
                    { key: i, className: `text-center p-4 ${i > 0 ? 'pt-8 md:pt-4' : ''}` },
                    React.createElement(
                        'p',
                        { className: 'text-3xl md:text-4xl font-extrabold bg-gradient-to-r from-cyber-teal to-cyber-blue bg-clip-text text-transparent mb-2 glow-text-teal' },
                        stat.count
                    ),
                    React.createElement('p', { className: 'text-xs text-gray-500 font-semibold tracking-wider uppercase' }, stat.label)
                ))
            )
        ),

        // Footer
        React.createElement(
            'footer',
            { className: 'border-t border-white/5 py-8 text-center text-xs text-gray-600 relative z-10' },
            React.createElement('p', null, `© ${new Date().getFullYear()} RTLGuard AI Systems. Secure Silicon Verification Paradigm. All Rights Reserved.`)
        )
    );
}
