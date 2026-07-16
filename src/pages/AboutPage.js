import React from 'https://esm.sh/react@18.2.0';
import GlassCard from '../components/GlassCard.js';
import { 
    Cpu, 
    ShieldAlert, 
    Binary, 
    Network, 
    Wrench,
    CheckSquare
} from 'https://esm.sh/lucide-react@0.344.0';

export default function AboutPage() {
    return React.createElement(
        'div',
        { className: 'flex-1 p-8 space-y-8 bg-cyber-black overflow-y-auto max-h-[calc(100vh-80px)]' },
        
        // 1. Mission statement
        React.createElement(
            GlassCard,
            { className: 'text-left max-w-4xl mx-auto' },
            React.createElement(
                'div',
                { className: 'flex items-center gap-4 mb-4' },
                React.createElement(
                    'div',
                    { className: 'p-3 bg-cyber-teal/10 rounded-xl text-cyber-teal border border-cyber-teal/20 glow-teal' },
                    React.createElement(Cpu, { className: 'w-6 h-6' })
                ),
                React.createElement('h2', { className: 'text-2xl font-bold text-white tracking-wide' }, 'Secure Silicon RTL Verification')
            ),
            React.createElement(
                'p',
                { className: 'text-gray-400 text-sm leading-relaxed mb-6' },
                'RTLGuard AI represents a paradigm shift in ASIC/FPGA hardware security. Traditional design verification tests for correctness but routinely overlooks hardware vulnerabilities. RTLGuard checks design files for hardware Trojan backdoors, clock domain boundary sync gaps, and latch inferences before physical layout compilation.'
            )
        ),

        // 2. Structural breakdown (Grid)
        React.createElement(
            'div',
            { className: 'grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto' },
            
            // Security audits card
            React.createElement(
                GlassCard,
                { className: 'text-left' },
                React.createElement(
                    'div',
                    { className: 'flex items-center gap-3 mb-4' },
                    React.createElement(ShieldAlert, { className: 'w-5 h-5 text-cyber-neon' }),
                    React.createElement('h4', { className: 'font-bold text-white' }, 'Trojan & Sneak-Path Audits')
                ),
                React.createElement(
                    'p',
                    { className: 'text-xs text-gray-500 leading-relaxed' },
                    'Scanning ports and local assignments for trigger pathways. Trojan triggers are often hidden in continuous bypass branches that unlock secret registers or overwrite memory buffers under specific multi-stage logic states.'
                )
            ),

            // CDC syncing card
            React.createElement(
                GlassCard,
                { className: 'text-left' },
                React.createElement(
                    'div',
                    { className: 'flex items-center gap-3 mb-4' },
                    React.createElement(Network, { className: 'w-5 h-5 text-cyber-teal' }),
                    React.createElement('h4', { className: 'font-bold text-white' }, 'Clock Domain Crossing (CDC)')
                ),
                React.createElement(
                    'p',
                    { className: 'text-xs text-gray-500 leading-relaxed' },
                    'Signals traversing clock boundaries without synchronizer flip-flops can cause metastability. The analyzer catches direct transfers, suggesting dual-flop synchronizers to align clock signals cleanly.'
                )
            ),

            // Latch inferences card
            React.createElement(
                GlassCard,
                { className: 'text-left' },
                React.createElement(
                    'div',
                    { className: 'flex items-center gap-3 mb-4' },
                    React.createElement(Binary, { className: 'w-5 h-5 text-cyber-blue' }),
                    React.createElement('h4', { className: 'font-bold text-white' }, 'Latch Prevention Checks')
                ),
                React.createElement(
                    'p',
                    { className: 'text-xs text-gray-500 leading-relaxed' },
                    'Incomplete assignments inside combinational logic cause the synthesis tool to infer latches. These latch structures create critical race paths and bypass system clock triggers, making chip behavior unstable.'
                )
            ),

            // Assignment compliance card
            React.createElement(
                GlassCard,
                { className: 'text-left' },
                React.createElement(
                    'div',
                    { className: 'flex items-center gap-3 mb-4' },
                    React.createElement(Wrench, { className: 'w-5 h-5 text-cyber-purple' }),
                    React.createElement('h4', { className: 'font-bold text-white' }, 'Block Logic Style Audits')
                ),
                React.createElement(
                    'p',
                    { className: 'text-xs text-gray-500 leading-relaxed' },
                    'Enforcing blocking assignments (=) in combinational blocks and non-blocking assignments (<=) in sequential always blocks. This ruleset ensures that logic behavior matches post-synthesis gate simulations.'
                )
            )
        ),

        // 3. AI Compiler Pipeline Flowchart
        React.createElement(
            GlassCard,
            { className: 'max-w-4xl mx-auto' },
            React.createElement('h3', { className: 'font-bold text-white text-md mb-6 text-center' }, 'Verification Pipeline Architecture'),
            
            React.createElement(
                'div',
                { className: 'flex flex-col md:flex-row items-center justify-between gap-4 py-4 px-8 relative' },
                
                // Flow Steps
                [
                    { title: 'Verilog RTL Source', desc: 'Hardware code intake (.v)' },
                    { title: 'AST Parser', desc: 'Syntactic token compiler' },
                    { title: 'Static Auditing', desc: 'Rules & pattern check' },
                    { title: 'AI Diagnostics', desc: 'CDC & Trojan scans' },
                    { title: 'Compliance Report', desc: 'Scores & recommendations' }
                ].map((step, idx, arr) => React.createElement(
                    'div',
                    { key: idx, className: 'flex flex-col items-center text-center relative z-10 w-40' },
                    React.createElement(
                        'div',
                        { className: 'w-10 h-10 rounded-full border border-cyber-teal/30 bg-cyber-teal/5 flex items-center justify-center font-bold text-cyber-teal text-sm mb-3 glow-teal' },
                        idx + 1
                    ),
                    React.createElement('p', { className: 'text-xs font-bold text-white' }, step.title),
                    React.createElement('p', { className: 'text-[10px] text-gray-500 mt-1' }, step.desc),
                    
                    // Arrow connector
                    idx < arr.length - 1 && React.createElement(
                        'div',
                        { className: 'hidden md:block absolute top-5 left-32 w-16 h-[1px] bg-gradient-to-r from-cyber-teal/40 to-transparent' }
                    )
                ))
            )
        )
    );
}
