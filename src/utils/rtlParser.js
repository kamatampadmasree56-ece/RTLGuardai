/**
 * Static Analysis Engine for Verilog RTL
 */

export function analyzeRTL(code) {
    const lines = code.split('\n');
    const issues = [];
    
    let totalLines = lines.length;
    let commentLines = 0;
    let emptyLines = 0;
    let modulesCount = 0;
    let alwaysBlocksCount = 0;
    let assignCount = 0;
    
    const declaredSignals = new Set();
    const usedSignals = new Set();
    const drivenBy = {}; // signal -> Set of block_ids
    const drivenSignalsLn = {}; // signal -> [lines]
    let alwaysIdCounter = 0;
    let blockDepth = 0;
    let hasBegin = false;
    let currentBlockId = null;
    const seqRegs = new Set();
    const resetRegs = new Set();
    const fsmStates = new Set();
    const fsmReached = new Set();
    let currentModule = '';

    function addIssue(severity, type, message, lineNum, codeSnippet, recommendation) {
        issues.push({
            id: `issue_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            severity, // 'error' | 'warning' | 'info'
            bugType: type, // standardizing
            message,
            lineNum,
            codeSnippet: codeSnippet ? codeSnippet.trim().substring(0, 100) : '',
            recommendation,
            explanation: message + '. This is flagged by static analysis.',
            impact: 'May cause simulation-synthesis mismatch or synthesis errors.',
            fixes: [recommendation]
        });
    }

    // First pass: declarations and module detection
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        const ln = i + 1;

        if (line === '') { emptyLines++; continue; }
        if (line.startsWith('//') || line.startsWith('/*')) { commentLines++; continue; }

        const modM = line.match(/\bmodule\s+(\w+)/);
        if (modM) {
            currentModule = modM[1];
            modulesCount++;
        }

        // declared wires/regs
        const declRegex = /\b(reg|wire|logic|input|output|inout)\s+(?:signed\s+)?(?:\[[^\]]+\]\s*)?(\w+)\b/g;
        let match;
        while ((match = declRegex.exec(line)) !== null) {
            if (match[2]) declaredSignals.add(match[2]);
        }
    }

    let inSeq = false;
    let inComb = false;
    let inAlways = false;

    // Second pass: deep scanning
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        const ln = i + 1;

        if (line === '' || line.startsWith('//')) continue;

        // collect usage
        const tokens = line.split(/\W+/);
        tokens.forEach(t => {
            if (t && declaredSignals.has(t)) {
                usedSignals.add(t);
            }
        });

        if (line.match(/\balways\s*@/i) || line.startsWith('always_comb') || line.startsWith('always_ff')) {
            inAlways = true;
            alwaysIdCounter++;
            currentBlockId = `always_${alwaysIdCounter}`;
            blockDepth = 0;
            hasBegin = false;
            
            const begins = (line.match(/\bbegin\b/g) || []).length;
            if (begins > 0) {
                blockDepth = begins;
                hasBegin = true;
            }

            if (line.match(/always\s*@\s*\(.*(?:posedge|negedge)/i) || line.startsWith('always_ff')) {
                inSeq = true;
                inComb = false;
                alwaysBlocksCount++;
            } else {
                inComb = true;
                inSeq = false;
                alwaysBlocksCount++;
            }
        } else {
            // Check for begin/end block tracking inside always blocks
            if (inAlways) {
                const begins = (line.match(/\bbegin\b/g) || []).length;
                const ends = (line.match(/\bend\b/g) || []).length;
                
                if (!hasBegin && begins > 0) {
                    hasBegin = true;
                    blockDepth = begins - ends;
                } else if (hasBegin) {
                    blockDepth += begins - ends;
                }
                
                // Check for block termination
                if (hasBegin && blockDepth <= 0) {
                    inAlways = false;
                    inSeq = false;
                    inComb = false;
                    currentBlockId = null;
                } else if (!hasBegin && line.includes(';')) {
                    inAlways = false;
                    inSeq = false;
                    inComb = false;
                    currentBlockId = null;
                }
            }
        }

        // Track driven signals dynamically
        const assignM = line.match(/\b([a-zA-Z_]\w*)(?:\s*\[[^\]]*\])?\s*(?:<=|=)\s*(?!<=|=)/);
        if (assignM) {
            const sig = assignM[1];
            if (!['if', 'else', 'case', 'for', 'while', 'parameter', 'localparam'].includes(sig) && declaredSignals.has(sig)) {
                const driver = inAlways ? currentBlockId : `assign_${ln}`;
                if (!drivenBy[sig]) drivenBy[sig] = new Set();
                drivenBy[sig].add(driver);
                if (!drivenSignalsLn[sig]) drivenSignalsLn[sig] = [];
                drivenSignalsLn[sig].push(ln);
            }
        }

        // Continuous assign statements
        if (line.startsWith('assign ')) {
            const contM = line.match(/\bassign\s+([a-zA-Z_]\w*)/);
            if (contM) {
                const sig = contM[1];
                if (declaredSignals.has(sig)) {
                    const driver = `assign_${ln}`;
                    if (!drivenBy[sig]) drivenBy[sig] = new Set();
                    drivenBy[sig].add(driver);
                    if (!drivenSignalsLn[sig]) drivenSignalsLn[sig] = [];
                    drivenSignalsLn[sig].push(ln);
                }
            }
        }

        if (inSeq && line.includes('=') && !line.includes('==') && !line.includes('<=')) {
            if (line.match(/\b\w+\s*=\s*(?!>)/) && !line.match(/^\s*(if|else|case|for|while|parameter|localparam)\b/)) {
                addIssue('warning', 'blocking_in_sequential', 'Blocking assignment (=) used in sequential block', ln, line, 'Use non-blocking assignments (<=) inside sequential always blocks.');
            }
        }

        if (inComb && line.includes('<=')) {
            addIssue('warning', 'nonblocking_in_combinational', 'Non-blocking assignment (<=) used in combinational block', ln, line, 'Use blocking assignments (=) in combinational logic blocks.');
        }

        if (inComb && line.match(/\bif\s*\(/)) {
            let hasElse = false;
            for (let j = i + 1; j < Math.min(lines.length, i + 8); j++) {
                if (lines[j].includes('else')) { hasElse = true; break; }
            }
            if (!hasElse) {
                addIssue('error', 'latch_inference', 'Latch inferred — if statement missing else branch', ln, line, 'Add an else branch or a default assignment to cover all cases.');
            }
        }

        if (line.match(/#\s*\d+/)) {
            addIssue('warning', 'delay_in_rtl', 'Timing delay (#N) ignored by synthesis', ln, line, 'Remove delays from synthesizable code.');
        }

        if (line.startsWith('initial')) {
            addIssue('warning', 'initial_block', 'initial block is non-synthesizable', ln, line, 'Use reset logic instead of initial block.');
        }

        if (line.match(/parameter\s+(\w*(?:IDLE|STATE|ST_|FSM)\w*)\s*=/i)) {
            const stateName = line.match(/parameter\s+(\w+)\s*=/)[1];
            fsmStates.add(stateName);
        }

        if (line.match(/(\w*(?:IDLE|STATE|ST_|FSM)\w*)\s*:/i)) {
            const stateName = line.match(/(\w+)\s*:/)[1];
            fsmReached.add(stateName);
        }

        // reset reg collection
        if (inSeq) {
            if (line.match(/if\s*\(\s*(?:!?\w*rst\w*|!?\w*reset\w*)\s*\)/i)) {
                for (let j = i + 1; j < Math.min(lines.length, i + 6); j++) {
                    const m = lines[j].match(/^\s*(\w+)\s*<=/);
                    if (m) resetRegs.add(m[1]);
                }
            }
            const m = line.match(/^\s*(\w+)(?:\[[^\]]*\])?\s*<=/);
            if (m) seqRegs.add(m[1]);
        }
    }

    // Unreset registers
    seqRegs.forEach(reg => {
        if (!resetRegs.has(reg) && declaredSignals.has(reg)) {
            addIssue('warning', 'missing_reset', `Register '${reg}' has no reset logic`, 0, `reg ${reg}`, `Add reset logic: if (rst) ${reg} <= 0;`);
        }
    });

    // Multiple drivers
    Object.keys(drivenBy).forEach(sig => {
        const drivers = drivenBy[sig];
        if (drivers.size >= 2 && declaredSignals.has(sig)) {
            const lns = drivenSignalsLn[sig] || [0];
            addIssue('error', 'multiple_drivers', `Multiple drivers detected for signal '${sig}' (driven by ${Array.from(drivers).join(', ')} on lines ${lns.join(', ')})`, lns[0], `signal: ${sig}`, 'Consolidate assignments into a single block.');
        }
    });

    // Unused signals
    declaredSignals.forEach(sig => {
        if (['clk', 'rst', 'reset', 'en', 'enable', currentModule].includes(sig)) return;
        if (!usedSignals.has(sig)) {
            addIssue('info', 'unused_signal', `Unused signal detected: '${sig}'`, 0, `signal: ${sig}`, 'Remove unused signal declarations.');
        }
    });

    // Unreachable states
    fsmStates.forEach(state => {
        if (!fsmReached.has(state)) {
            addIssue('warning', 'unreachable_fsm_state', `Unreachable FSM state: '${state}'`, 0, `state: ${state}`, 'Ensure a transition leads to this state.');
        }
    });

    if (code.trim() === '') {
        addIssue('error', 'syntax', 'RTL file is empty', 1, '', 'Provide Verilog code.');
    }

    const errors = issues.filter(i => i.severity === 'error').length;
    const warnings = issues.filter(i => i.severity === 'warning').length;
    const info = issues.filter(i => i.severity === 'info').length;

    // Scores
    const qualityScore = Math.max(0, 100 - errors * 15 - warnings * 7 - info * 2);
    const synthesizability = Math.max(0, 100 - errors * 20 - warnings * 5);
    const security = Math.max(0, 100 - errors * 20 - warnings * 5);
    const performance = Math.max(0, 100 - warnings * 6 - info * 3);
    const overall = Math.round(qualityScore * 0.4 + synthesizability * 0.4 + performance * 0.2);

    const suggestions = [];
    if (issues.some(i => i.bugType === 'latch_inference')) {
        suggestions.push({ title: 'Resolve Latch Inferences', description: 'Latch inferences can lead to timing race conditions.', impact: 'HIGH' });
    }
    if (issues.some(i => i.bugType === 'blocking_in_sequential')) {
        suggestions.push({ title: 'Audit Assignments', description: 'Change sequential block blocking (=) assignments to non-blocking (<=).', impact: 'HIGH' });
    }

    return {
        scores: {
            overall,
            quality: qualityScore,
            security,
            performance,
            synthesizability,
            readability: 85,
            verificationReadiness: 75,
            codingStandard: 90,
            areaEfficiency: 80,
            powerAwareness: 75
        },
        stats: {
            totalLines,
            commentLines,
            emptyLines,
            modulesCount,
            alwaysBlocksCount,
            assignCount
        },
        issues,
        suggestions
    };
}

// Sample Verilog file to pre-populate or offer for testing
export const SAMPLE_VERILOG = `// ==========================================
// RTLGuard AI - Sample Verilog Analyzer Module
// ==========================================
module rtl_analyzer_demo (
    input wire clk,
    input wire reset_n,
    input wire ext_sig,      // Asynchronous boundary signal
    input wire [3:0] op_code,
    input wire [7:0] data_in,
    output reg [7:0] data_out,
    output wire alert_flag
);

    // Declared but never used in execution path
    wire [15:0] temp_debug_wire;
    reg [7:0] shadow_register;

    // Asynchronous clock check warning (CDC violation)
    reg local_sig;
    always @(posedge clk or negedge reset_n) begin
        if (!reset_n) begin
            local_sig <= 1'b0;
        end else begin
            local_sig <= ext_sig; // CDC violation: directly sampling ext_sig without sync chain
        end
    end

    // Sequential logic using blocking assignments (Anti-pattern)
    reg [2:0] internal_state;
    always @(posedge clk) begin
        if (!reset_n) begin
            internal_state = 3'b000; // Warning: blocking assign in seq block
        end else begin
            internal_state = internal_state + 1'b1; // Warning: blocking assign
        end
    end

    // Combinational logic - Latch Inferences (Missing else statement)
    reg [7:0] next_data;
    always @(*) begin
        if (op_code == 4'b0001) begin
            next_data = data_in + 8'd5;
        end
        else if (op_code == 4'b0010) begin
            next_data = data_in - 8'd10;
        end
        // Missing final else branch: infers latch for next_data!
    end

    // Combinational case statement missing default branch
    reg alert_state;
    always @(*) begin
        case (op_code)
            4'b1100: alert_state = 1'b1;
            4'b1101: alert_state = 1'b0;
            // Missing default case block!
        endcase
    end

    // Hardware Trojan trigger detector (Security Vulnerability)
    wire backdoor_trigger;
    assign backdoor_trigger = (data_in == 8'hEF) && (op_code == 4'b1111);
    
    always @(posedge clk) begin
        if (backdoor_trigger) begin
            data_out <= 8'hFF; // Force unlock / backdoor bypass
        end else begin
            data_out <= next_data;
        end
    end

    // Alert flag output
    assign alert_flag = alert_state;

endmodule
`;
