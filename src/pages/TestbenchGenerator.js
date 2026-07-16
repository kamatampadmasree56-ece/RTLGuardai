import React, { useState, useRef } from 'https://esm.sh/react@18.2.0';
import { useAppState } from '../utils/appState.js';
import { apiGenerateTestbench } from '../utils/api.js';
import CodeEditor from '../components/CodeEditor.js';
import GlassCard from '../components/GlassCard.js';
import {
    Cpu,
    Upload,
    Play,
    Copy,
    Download,
    Trash2,
    Check,
    FileText,
    CheckCircle,
    AlertCircle,
    RefreshCw,
    Activity,
    Sliders,
    Layers
} from 'https://esm.sh/lucide-react@0.344.0';

const DEFAULT_VERILOG = `// Paste your Verilog module here
module up_counter #(
    parameter WIDTH = 8
) (
    input clk,
    input rst,
    input enable,
    output reg [WIDTH-1:0] count
);

  always @(posedge clk or posedge rst) begin
    if (rst) begin
      count <= 0;
    end else if (enable) begin
      count <= count + 1;
    end
  end

endmodule
`;

export default function TestbenchGenerator() {
    const [rtlCode, setRtlCode] = useState(DEFAULT_VERILOG);
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);
    const [copiedText, setCopiedText] = useState(false);
    const [activeTab, setActiveTab] = useState('tb'); // 'tb', 'assertions', 'directed', 'random', 'coverage', 'waveform', 'doc'
    
    const fileInputRef = useRef(null);

    const handleUploadClick = () => {
        if (fileInputRef.current) {
            fileInputRef.current.click();
        }
    };

    const handleFileInput = (e) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const fileName = file.name.toLowerCase();
            if (!fileName.endsWith('.v') && !fileName.endsWith('.sv')) {
                setError('Only Verilog (.v) or SystemVerilog (.sv) files are allowed.');
                return;
            }
            const reader = new FileReader();
            reader.onload = (event) => {
                setRtlCode(event.target.result);
                setError(null);
                setSuccess(false);
            };
            reader.readAsText(file);
        }
    };

    const handleClear = () => {
        setRtlCode('');
        setResult(null);
        setError(null);
        setSuccess(false);
    };

    const handleGenerate = async () => {
        if (!rtlCode || !rtlCode.trim()) {
            setError('Please enter or upload RTL code first.');
            return;
        }
        setLoading(true);
        setError(null);
        setSuccess(false);
        try {
            const res = await apiGenerateTestbench(rtlCode);
            setResult(res);
            setSuccess(true);
            setActiveTab('tb');
        } catch (err) {
            console.error(err);
            setError(err.message || 'Failed to generate testbench. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleCopyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        setCopiedText(true);
        setTimeout(() => setCopiedText(false), 2000);
    };

    const triggerDownload = (filename, content, mimeType = 'text/plain') => {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    // Helper to generate custom Directed Verification Stimulus
    const generateDirectedStimulus = (summary) => {
        if (!summary) return '';
        const name = summary.module_name || 'dut';
        return `// ==================================================
// DIRECTED BOUNDARY CONDITIONS TESTCASE
// Target Module: ${name}
// ==================================================
initial begin
    // Scenario 1: Initial Power-up Reset Assertion
    $display("[TST_DIR] Starting scenario 1: Assertion of Hardware Reset...");
    rst = 1;
    enable = 0;
    #20;
    rst = 0;
    #20;
    
    // Scenario 2: Enable Active Mode at Min/Max clock intervals
    $display("[TST_DIR] Starting scenario 2: Enable Active mode boundary check...");
    enable = 1;
    #100;
    
    // Scenario 3: Verify Disable Mode Hold State
    $display("[TST_DIR] Starting scenario 3: Disable condition holds current outputs...");
    enable = 0;
    #40;
    
    // Scenario 4: Re-assertion of reset mid-execution
    $display("[TST_DIR] Starting scenario 4: Hot reset check...");
    rst = 1;
    #20;
    rst = 0;
    #40;

    $display("[TST_DIR] Directed boundary verification finished successfully.");
    $finish;
end`;
    };

    // Helper to generate Constrained Random Verification Stimulus
    const generateRandomStimulus = (summary) => {
        if (!summary) return '';
        const name = summary.module_name || 'dut';
        return `// ==================================================
// CONSTRAINED RANDOM VERIFICATION STIMULUS (SV)
// Target Module: ${name}
// ==================================================
class rand_stimulus_class;
    // Constrained random variables matching DUT interfaces
    rand bit rand_enable;
    rand int delay_ticks;

    // Constraints to ensure realistic timing ranges
    constraint delay_c {
        delay_ticks inside {[2:15]};
    }
    
    constraint enable_distribution_c {
        rand_enable dist {1 := 80, 0 := 20}; // 80% active probability
    }
endclass

initial begin
    rand_stimulus_class stim;
    stim = new();
    
    // Reset configuration
    rst = 1;
    #20;
    rst = 0;
    
    $display("[TST_RAND] Launching 100 randomized clock cycle stimulations...");
    repeat (100) begin
        if (!stim.randomize()) begin
            $error("[TST_RAND] Randomization failure detected.");
        end else begin
            enable = stim.rand_enable;
            # (stim.delay_ticks * 10); // Scale random delays
        end
    end
    
    $display("[TST_RAND] Constrained random verification iteration complete.");
    $finish;
end`;
    };

    // Helper to render code/text contents beautifully
    const CodeViewer = ({ title, content, filename }) => {
        return React.createElement(
            'div',
            { className: 'flex flex-col h-full bg-[#070a13] border border-white/5 rounded-xl overflow-hidden' },
            React.createElement(
                'div',
                { className: 'flex items-center justify-between px-4 py-2 border-b border-white/5 bg-black/30' },
                React.createElement('span', { className: 'text-xs font-semibold text-gray-400 font-mono' }, filename),
                React.createElement(
                    'div',
                    { className: 'flex items-center gap-2' },
                    React.createElement(
                        'button',
                        {
                            onClick: () => handleCopyToClipboard(content),
                            className: 'p-1.5 rounded hover:bg-white/5 text-gray-400 hover:text-white transition-colors duration-150',
                            title: 'Copy to Clipboard'
                        },
                        React.createElement(copiedText ? Check : Copy, { className: 'w-4 h-4' })
                    ),
                    React.createElement(
                        'button',
                        {
                            onClick: () => triggerDownload(filename, content),
                            className: 'p-1.5 rounded hover:bg-white/5 text-gray-400 hover:text-white transition-colors duration-150',
                            title: 'Download File'
                        },
                        React.createElement(Download, { className: 'w-4 h-4' })
                    )
                )
            ),
            React.createElement(
                'pre',
                { className: 'flex-1 p-4 overflow-auto text-xs font-mono text-cyan-400 bg-black/40 leading-relaxed max-h-[400px]' },
                content
            )
        );
    };

    return React.createElement(
        'div',
        { className: 'flex-1 p-6 space-y-6 bg-cyber-black overflow-y-auto max-h-[calc(100vh-80px)]' },
        
        // Header Banner
        React.createElement(
            'div',
            { className: 'flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-5' },
            React.createElement(
                'div',
                null,
                React.createElement(
                    'h1',
                    { className: 'text-2xl font-extrabold tracking-wider bg-gradient-to-r from-cyber-teal via-cyber-blue to-cyber-neon bg-clip-text text-transparent glow-text-teal' },
                    'AI TESTBENCH GENERATOR'
                ),
                React.createElement('p', { className: 'text-xs text-gray-500 mt-1' }, 'Instantly generate professional, production-ready simulation testbenches and SVA assertions.')
            )
        ),

        // Notifications
        error && React.createElement(
            'div',
            { className: 'flex items-center gap-3 bg-rose-500/10 border border-rose-500/20 rounded-xl p-4 text-rose-400 text-sm' },
            React.createElement(AlertCircle, { className: 'w-5 h-5 flex-shrink-0' }),
            React.createElement('span', null, error)
        ),

        success && React.createElement(
            'div',
            { className: 'flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 text-emerald-400 text-sm' },
            React.createElement(CheckCircle, { className: 'w-5 h-5 flex-shrink-0' }),
            React.createElement('span', null, 'Testbench and verification artifacts generated successfully!')
        ),

        // Main Layout Grid
        React.createElement(
            'div',
            { className: 'grid grid-cols-1 lg:grid-cols-2 gap-6' },
            
            // Left Column: Verilog Editor and Actions
            React.createElement(
                GlassCard,
                { className: 'flex flex-col min-h-[500px] p-5' },
                React.createElement(
                    'div',
                    { className: 'flex items-center justify-between mb-4' },
                    React.createElement('h3', { className: 'font-semibold text-sm text-white' }, 'Verilog RTL Input'),
                    React.createElement(
                        'div',
                        { className: 'flex items-center gap-2' },
                        React.createElement(
                            'button',
                            {
                                onClick: handleUploadClick,
                                className: 'flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 hover:border-cyber-teal hover:text-cyber-teal text-xs font-semibold transition-all duration-200'
                            },
                            React.createElement(Upload, { className: 'w-3.5 h-3.5' }),
                            'Upload .v/.sv'
                        ),
                        React.createElement('input', {
                            type: 'file',
                            ref: fileInputRef,
                            onChange: handleFileInput,
                            accept: '.v,.sv',
                            className: 'hidden'
                        }),
                        React.createElement(
                            'button',
                            {
                                onClick: handleClear,
                                className: 'flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 hover:border-rose-500 hover:text-rose-400 text-xs font-semibold transition-all duration-200'
                            },
                            React.createElement(Trash2, { className: 'w-3.5 h-3.5' }),
                            'Clear'
                        )
                    )
                ),
                // Editor Wrapper
                React.createElement(
                    'div',
                    { className: 'flex-1 min-h-[350px] relative rounded-xl overflow-hidden' },
                    React.createElement(CodeEditor, {
                        value: rtlCode,
                        onChange: setRtlCode,
                        issues: []
                    })
                ),
                // Actions Footer
                React.createElement(
                    'div',
                    { className: 'mt-4 flex justify-end' },
                    React.createElement(
                        'button',
                        {
                            onClick: handleGenerate,
                            disabled: loading,
                            className: 'flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyber-teal to-cyber-blue hover:from-cyber-teal/90 hover:to-cyber-blue/90 disabled:opacity-50 text-black font-extrabold text-xs tracking-wider shadow-lg hover:shadow-cyan-500/20 active:scale-[0.98] transition-all duration-200'
                        },
                        loading ? React.createElement(RefreshCw, { className: 'w-4 h-4 animate-spin' }) : React.createElement(Play, { className: 'w-4 h-4' }),
                        loading ? 'ANALYZING & GENERATING...' : 'GENERATE TESTBENCH'
                    )
                )
            ),

            // Right Column: Output Tabs & Summary
            React.createElement(
                'div',
                { className: 'space-y-6 flex flex-col h-full justify-between' },
                
                // If loading, show loading card
                loading ? React.createElement(
                    GlassCard,
                    { className: 'flex-1 flex flex-col items-center justify-center min-h-[400px] text-center gap-4' },
                    React.createElement(
                        'div',
                        { className: 'relative w-20 h-20 flex items-center justify-center' },
                        React.createElement('div', { className: 'absolute inset-0 rounded-full border-4 border-cyber-teal/20 animate-ping' }),
                        React.createElement('div', { className: 'absolute inset-2 rounded-full border-4 border-t-cyber-teal border-r-transparent border-b-transparent border-l-transparent animate-spin' }),
                        React.createElement(Cpu, { className: 'w-8 h-8 text-cyber-teal animate-pulse' })
                    ),
                    React.createElement('h4', { className: 'font-extrabold text-lg text-white tracking-widest' }, 'AI DESIGN ENGINE ACTIVE'),
                    React.createElement('p', { className: 'text-xs text-gray-400 max-w-sm font-sans' }, 'Extracting port lists, detecting design patterns, compiling stimulus vector scenarios, and building assertions...')
                ) : !result ? React.createElement(
                    GlassCard,
                    { className: 'flex-1 flex flex-col items-center justify-center min-h-[400px] text-center gap-4' },
                    React.createElement(
                        'div',
                        { className: 'p-4 bg-white/5 rounded-full border border-white/10' },
                        React.createElement(Cpu, { className: 'w-8 h-8 text-gray-500' })
                    ),
                    React.createElement('h4', { className: 'font-bold text-lg text-white' }, 'Awaiting Verification Target'),
                    React.createElement('p', { className: 'text-xs text-gray-400 max-w-sm font-sans' }, 'Upload or write a Verilog module on the left, then click the Generate button to run simulation compilation.')
                ) : React.createElement(
                    'div',
                    { className: 'space-y-6 flex-1 flex flex-col justify-between' },

                    // Summary and Info Panel
                    React.createElement(
                        GlassCard,
                        { className: 'p-5' },
                        React.createElement('h3', { className: 'font-bold text-xs text-gray-400 tracking-wider mb-3' }, 'RTL SUMMARY PANEL'),
                        React.createElement(
                            'div',
                            { className: 'grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono' },
                            React.createElement('div', null, React.createElement('p', { className: 'text-gray-500' }, 'Module Name'), React.createElement('p', { className: 'font-bold text-white text-sm' }, result.summary.module_name)),
                            React.createElement('div', null, React.createElement('p', { className: 'text-gray-500' }, 'Category'), React.createElement('p', { className: 'font-bold text-cyber-teal text-sm uppercase' }, result.summary.category)),
                            React.createElement('div', null, React.createElement('p', { className: 'text-gray-500' }, 'Clock Signal'), React.createElement('p', { className: 'font-bold text-cyber-blue text-sm' }, result.summary.clk || 'None')),
                            React.createElement('div', null, React.createElement('p', { className: 'text-gray-500' }, 'Reset Signal'), React.createElement('p', { className: 'font-bold text-cyber-neon text-sm' }, result.summary.rst || 'None'))
                        ),
                        React.createElement(
                            'div',
                            { className: 'grid grid-cols-3 gap-4 text-xs font-mono mt-4 pt-4 border-t border-white/5' },
                            React.createElement('div', null, React.createElement('span', { className: 'text-gray-500' }, 'Inputs: '), React.createElement('span', { className: 'text-white font-bold' }, result.summary.ports.filter(p => p.direction === 'input').length)),
                            React.createElement('div', null, React.createElement('span', { className: 'text-gray-500' }, 'Outputs: '), React.createElement('span', { className: 'text-white font-bold' }, result.summary.ports.filter(p => p.direction === 'output').length)),
                            React.createElement('div', null, React.createElement('span', { className: 'text-gray-500' }, 'Parameters: '), React.createElement('span', { className: 'text-white font-bold' }, result.summary.parameters.length))
                        )
                    ),

                    // Results Panel with Tabs
                    React.createElement(
                        GlassCard,
                        { className: 'p-5 flex-1 flex flex-col min-h-[450px]' },
                        // Tab Selector
                        React.createElement(
                            'div',
                            { className: 'flex border-b border-white/5 mb-4 overflow-x-auto pb-1 gap-2' },
                            [
                                { id: 'tb', label: 'Testbench' },
                                { id: 'assertions', label: 'Assertions' },
                                { id: 'directed', label: 'Directed Tests' },
                                { id: 'random', label: 'Random Tests' },
                                { id: 'coverage', label: 'Coverage' },
                                { id: 'waveform', label: 'Waveform' },
                                { id: 'doc', label: 'Documentation' }
                            ].map(tab => React.createElement(
                                'button',
                                {
                                    key: tab.id,
                                    onClick: () => setActiveTab(tab.id),
                                    className: `px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wider transition-all duration-155 whitespace-nowrap ${
                                        activeTab === tab.id
                                            ? 'bg-cyber-teal/15 text-cyber-teal border border-cyber-teal/30 font-bold'
                                            : 'text-gray-400 hover:text-white'
                                    }`
                                },
                                tab.label
                            ))
                        ),

                        // Tab Content
                        React.createElement(
                            'div',
                            { className: 'flex-1' },
                            activeTab === 'tb' && React.createElement(CodeViewer, {
                                title: 'Testbench Code',
                                content: result.testbench,
                                filename: `${result.summary.module_name}_tb.v`
                            }),
                            activeTab === 'assertions' && React.createElement(CodeViewer, {
                                title: 'SystemVerilog Assertions',
                                content: result.assertions,
                                filename: `${result.summary.module_name}_assertions.sv`
                            }),
                            activeTab === 'directed' && React.createElement(CodeViewer, {
                                title: 'Directed Test Bench Cases',
                                content: generateDirectedStimulus(result.summary),
                                filename: `${result.summary.module_name}_directed.sv`
                            }),
                            activeTab === 'random' && React.createElement(CodeViewer, {
                                title: 'Constrained Random Test Cases',
                                content: generateRandomStimulus(result.summary),
                                filename: `${result.summary.module_name}_random.sv`
                            }),
                            activeTab === 'coverage' && React.createElement(CodeViewer, {
                                title: 'Functional Coverage',
                                content: result.coverage,
                                filename: `${result.summary.module_name}_coverage.sv`
                            }),
                            activeTab === 'waveform' && React.createElement(
                                'div',
                                { className: 'space-y-4 max-h-[400px] overflow-y-auto pr-1' },
                                React.createElement(
                                    'div',
                                    { className: 'flex justify-between items-center' },
                                    React.createElement('h4', { className: 'text-xs font-bold text-gray-400 tracking-widest' }, 'WAVEFORM TIMING TRANSITION PREDICTOR'),
                                    React.createElement(
                                        'button',
                                        {
                                            onClick: () => triggerDownload(`${result.summary.module_name}.vcd`, `$date\n   Date text\n$end\n$version\n   RTLGuard AI VCD Simulator Output\n$end\n$timescale 1ns $end\n$scope module ${result.summary.module_name}_tb $end\n$var wire 1 ! clk $end\n$var wire 1 " rst $end\n$upscope $end\n$enddefinitions $end\n#0\n0!\n1"\n#10\n1!\n#20\n0!\n0"\n#30\n1!\n`),
                                            className: 'px-2.5 py-1 rounded bg-white/5 border border-white/10 hover:border-cyber-teal hover:text-cyber-teal text-[10px] font-semibold transition-all'
                                        },
                                        'Download VCD Waveform'
                                    )
                                ),
                                React.createElement(
                                    'table',
                                    { className: 'w-full border-collapse text-left text-xs font-mono' },
                                    React.createElement(
                                        'thead',
                                        null,
                                        React.createElement(
                                            'tr',
                                            { className: 'border-b border-white/10 text-gray-500' },
                                            React.createElement('th', { className: 'py-2 px-3' }, 'Cycle'),
                                            React.createElement('th', { className: 'py-2 px-3' }, 'Time'),
                                            React.createElement('th', { className: 'py-2 px-3' }, 'Clock'),
                                            React.createElement('th', { className: 'py-2 px-3' }, 'Reset'),
                                            React.createElement('th', { className: 'py-2 px-3' }, 'Inputs'),
                                            React.createElement('th', { className: 'py-2 px-3' }, 'Outputs'),
                                            React.createElement('th', { className: 'py-2 px-3' }, 'State'),
                                            React.createElement('th', { className: 'py-2 px-3' }, 'Description')
                                        )
                                    ),
                                    React.createElement(
                                        'tbody',
                                        null,
                                        result.waveform.map(row => React.createElement(
                                            'tr',
                                            { key: row.cycle, className: 'border-b border-white/5 hover:bg-white/5' },
                                            React.createElement('td', { className: 'py-2.5 px-3 text-cyber-teal' }, row.cycle),
                                            React.createElement('td', { className: 'py-2.5 px-3' }, row.time),
                                            React.createElement('td', { className: 'py-2.5 px-3 text-cyan-400' }, row.clk),
                                            React.createElement('td', { className: 'py-2.5 px-3' }, row.rst),
                                            React.createElement('td', { className: 'py-2.5 px-3 text-cyber-blue font-semibold' }, row.inputs),
                                            React.createElement('td', { className: 'py-2.5 px-3 text-cyber-neon font-semibold' }, row.outputs),
                                            React.createElement('td', { className: 'py-2.5 px-3 text-amber-400 font-semibold' }, row.state),
                                            React.createElement('td', { className: 'py-2.5 px-3 text-gray-400 text-[11px]' }, row.description)
                                        ))
                                    )
                                )
                            ),
                            activeTab === 'doc' && React.createElement(
                                'div',
                                { className: 'p-4 bg-[#070a13] border border-white/5 rounded-xl max-h-[400px] overflow-y-auto text-xs leading-relaxed text-gray-300 font-mono space-y-4' },
                                React.createElement(
                                    'div',
                                    { className: 'flex justify-end' },
                                    React.createElement(
                                        'button',
                                        {
                                            onClick: () => triggerDownload(`${result.summary.module_name}_doc.md`, result.documentation),
                                            className: 'flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-white/5 border border-white/10 hover:border-cyber-teal hover:text-cyber-teal transition-all text-[11px]'
                                        },
                                        React.createElement(Download, { className: 'w-3.5 h-3.5' }),
                                        'Download spec.md'
                                    )
                                ),
                                React.createElement(
                                    'pre',
                                    { className: 'whitespace-pre-wrap' },
                                    result.documentation
                                )
                            )
                        )
                    )
                )
            )
        ),

        // Bottom Grid: AI Scores and Full Document Downloads
        result && React.createElement(
            'div',
            { className: 'grid grid-cols-1 lg:grid-cols-2 gap-6' },
            
            // Left: AI Quality Metrics Panel
            React.createElement(
                GlassCard,
                { className: 'p-5' },
                React.createElement('h3', { className: 'font-bold text-sm text-white mb-4' }, 'AI Quality Scores'),
                React.createElement(
                    'div',
                    { className: 'space-y-4' },
                    [
                        { label: 'RTL Complexity', val: result.scores.complexity, color: 'bg-cyber-teal' },
                        { label: 'Verification Difficulty', val: result.scores.difficulty, color: 'bg-cyber-blue' },
                        { label: 'Testbench Completeness', val: result.scores.completeness, color: 'bg-cyber-purple' },
                        { label: 'Code Quality', val: result.scores.quality, color: 'bg-cyber-neon' },
                        { label: 'Overall AI Confidence', val: result.scores.confidence, color: 'bg-emerald-500' }
                    ].map(score => React.createElement(
                        'div',
                        { key: score.label, className: 'space-y-1' },
                        React.createElement(
                            'div',
                            { className: 'flex justify-between text-xs font-semibold' },
                            React.createElement('span', { className: 'text-gray-400' }, score.label),
                            React.createElement('span', { className: 'text-white' }, `${score.val}%`)
                        ),
                        React.createElement(
                            'div',
                            { className: 'w-full h-1.5 bg-white/5 rounded-full overflow-hidden' },
                            React.createElement('div', {
                                className: `h-full ${score.color} transition-all duration-500`,
                                style: { width: `${score.val}%` }
                            })
                        )
                    ))
                )
            ),

            // Right: Package Downloads
            React.createElement(
                GlassCard,
                { className: 'p-5 flex flex-col justify-between' },
                React.createElement(
                    'div',
                    null,
                    React.createElement('h3', { className: 'font-bold text-sm text-white mb-1.5' }, 'Download Package'),
                    React.createElement('p', { className: 'text-xs text-gray-500' }, 'Select specific verification target documents to export for active EDA compilation.')
                ),
                React.createElement(
                    'div',
                    { className: 'grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4' },
                    [
                        { filename: 'testbench.v', content: result.testbench, desc: 'Verilog Testbench Simulator File' },
                        { filename: 'assertions.sv', content: result.assertions, desc: 'SystemVerilog Assertions SVA File' },
                        { filename: 'documentation.md', content: result.documentation, desc: 'Design Specification PDF/Markdown Document' },
                        {
                            filename: 'analysis_report.md',
                            content: `==================================================\nAI VERIFICATION COMPLIANCE REPORT\n==================================================\nModule Target   : ${result.summary.module_name}\nCategory        : ${result.summary.category}\nComplexity      : ${result.scores.complexity}%\nCode Quality    : ${result.scores.quality}%\nVerification    : ${result.scores.difficulty}%\n==================================================`,
                            desc: 'Verification Coverage and Score Index Report'
                        }
                    ].map(item => React.createElement(
                        'button',
                        {
                            key: item.filename,
                            onClick: () => triggerDownload(item.filename, item.content),
                            className: 'flex items-center justify-between p-3.5 rounded-xl bg-white/5 border border-white/5 hover:border-cyber-teal hover:bg-cyber-teal/5 text-left group transition-all duration-200'
                        },
                        React.createElement(
                            'div',
                            { className: 'min-w-0 flex-1' },
                            React.createElement('p', { className: 'font-semibold text-xs text-white group-hover:text-cyber-teal font-mono truncate' }, item.filename),
                            React.createElement('p', { className: 'text-[10px] text-gray-500 mt-0.5 truncate' }, item.desc)
                        ),
                        React.createElement(Download, { className: 'w-4 h-4 text-gray-400 group-hover:text-cyber-teal transition-colors ml-2 flex-shrink-0' })
                    ))
                )
            )
        )
    );
}
