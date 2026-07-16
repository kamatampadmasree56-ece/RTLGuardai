"""
RTLGuard AI — Upgraded RTL Static Analysis and Linting Engine
Runs 100+ Class-Based Lint Rules | Detailed Hardware Metrics | Auto-Fix Generator
"""

import re
from typing import List, Dict, Any, Set
from lint_rules_base import RuleContext
from lint_rules_collection import rules_list

# ─────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────

def clean_code(code: str) -> str:
    """Remove comments for cleaner analysis."""
    code = re.sub(r'/\*.*?\*/', '', code, flags=re.DOTALL)
    code = re.sub(r'//.*', '', code)
    return code


def get_lines(code: str) -> List[str]:
    return code.split('\n')


def extract_reset_block_registers(clean_lines: List[str], start_idx: int) -> Set[str]:
    regs = set()
    num_lines = len(clean_lines)
    if start_idx >= num_lines:
        return regs
    
    if_line_has_begin = False
    if start_idx > 0:
        if_line_has_begin = 'begin' in clean_lines[start_idx - 1]
        
    first_non_empty_idx = start_idx
    while first_non_empty_idx < num_lines and not clean_lines[first_non_empty_idx].strip():
        first_non_empty_idx += 1
        
    if first_non_empty_idx >= num_lines:
        return regs
        
    first_line = clean_lines[first_non_empty_idx].strip()
    
    if if_line_has_begin or 'begin' in first_line:
        depth = 0
        if if_line_has_begin:
            depth += clean_lines[start_idx - 1].count('begin') - clean_lines[start_idx - 1].count('end')
        
        idx = first_non_empty_idx
        if depth <= 0:
            depth = 1
            
        while idx < num_lines and depth > 0:
            line = clean_lines[idx].strip()
            m = re.match(r'^\s*([a-zA-Z_]\w*)\s*(?:<=|=)', line)
            if m:
                regs.add(m.group(1))
            
            begins = len(re.findall(r'\bbegin\b', line))
            ends = len(re.findall(r'\bend\b', line))
            depth += begins - ends
            idx += 1
    else:
        idx = first_non_empty_idx
        while idx < num_lines:
            line = clean_lines[idx].strip()
            m = re.match(r'^\s*([a-zA-Z_]\w*)\s*(?:<=|=)', line)
            if m:
                regs.add(m.group(1))
            if ';' in line or 'end' in line:
                break
            idx += 1
            
    return regs


# ─────────────────────────────────────────────
# Main Parser & Lint Engine Core
# ─────────────────────────────────────────────

def detect_all(code: str) -> Dict[str, Any]:
    """
    Constructs the compilation context and executes the modular rules list.
    """
    cleaned = clean_code(code)
    lines = get_lines(code)
    clean_lines = get_lines(cleaned)

    # ── Context Extraction Variables
    declared_signals: Set[str] = set()
    used_signals: Set[str] = set()
    driven_by: Dict[str, Set[str]] = {}
    seq_regs: Set[str] = set()
    reset_regs: Set[str] = set()
    fsm_states: Set[str] = set()
    fsm_reached: Set[str] = set()
    current_module = "unknown"

    # Block variables
    in_seq = False
    in_comb = False
    in_always = False
    always_id_counter = 0
    block_depth = 0
    has_begin = False
    current_block_id = None

    line_to_block_id = {}
    line_to_in_seq = {}
    line_to_in_comb = {}
    line_to_in_always = {}
    driven_signals_ln = {}

    # ── First pass: extract declarations
    memory_arrays: Set[str] = set()
    for i, raw in enumerate(clean_lines):
        line = raw.strip()
        ln = i + 1

        mod_m = re.search(r'\bmodule\s+(\w+)', line)
        if mod_m:
            current_module = mod_m.group(1)

        # collect declared signals
        for m in re.finditer(r'\b(?:reg|wire|logic)\s+(?:\[[^\]]+\])?\s*([a-zA-Z_]\w*)\b', line):
            declared_signals.add(m.group(1))
        for m in re.finditer(r'\b(?:input|output|inout)\s+(?:reg|wire)?\s*(?:\[[^\]]+\])?\s*([a-zA-Z_]\w*)\b', line):
            declared_signals.add(m.group(1))
        for m in re.finditer(r'\b(?:reg|logic|wire)\s+(?:\[[^\]]+\])?\s*([a-zA-Z_]\w*)\s*\[[^\]]+\]', line):
            memory_arrays.add(m.group(1))

    # ── Second pass: track block context and signals driven
    for i, raw in enumerate(lines):
        clean_raw = clean_lines[i].strip() if i < len(clean_lines) else ""
        line = raw.strip()
        ln = i + 1

        # Track used signals (RHS usage)
        for m in re.finditer(r'\b([a-zA-Z_]\w*)\b', clean_raw):
            used_signals.add(m.group(1))

        should_terminate = False
        # ── Detect always block entry
        if re.search(r'\balways\s*@', clean_raw, re.I) or clean_raw.startswith('always_comb') or clean_raw.startswith('always_ff'):
            in_always = True
            always_id_counter += 1
            current_block_id = f"always_{always_id_counter}"
            block_depth = 0
            has_begin = False
            
            if re.search(r'\bbegin\b', clean_raw):
                block_depth = 1
                has_begin = True

            if re.search(r'always\s*@\s*\(.*(?:posedge|negedge)', clean_raw, re.I) or clean_raw.startswith('always_ff'):
                in_seq, in_comb = True, False
            else:
                in_comb, in_seq = True, False
        else:
            # Check for begin/end block tracking inside always blocks
            if in_always:
                begins = len(re.findall(r'\bbegin\b', clean_raw))
                ends = len(re.findall(r'\bend\b', clean_raw))
                
                if not has_begin and begins > 0:
                    has_begin = True
                    block_depth = begins - ends
                elif has_begin:
                    block_depth += begins - ends
                
                # Check for block termination
                if has_begin and block_depth <= 0:
                    should_terminate = True
                elif not has_begin and ';' in clean_raw:
                    # Single statement always block ends at semicolon, unless the next token is else
                    next_is_else = False
                    for next_idx in range(i + 1, min(i + 4, len(clean_lines))):
                        next_line = clean_lines[next_idx].strip()
                        if next_line:
                            if next_line.startswith('else'):
                                next_is_else = True
                            break
                    if not next_is_else:
                        should_terminate = True

        # Record context mapping per line
        line_to_block_id[ln] = current_block_id
        line_to_in_seq[ln] = in_seq
        line_to_in_comb[ln] = in_comb
        line_to_in_always[ln] = in_always

        # Track driven signals dynamically
        if assign_m := re.search(r'\b([a-zA-Z_]\w*)(?:\s*\[[^\]]*\])?\s*(?:<=|=)\s*(?!<=|=)', clean_raw):
            sig = assign_m.group(1)
            if sig not in ('if', 'else', 'case', 'for', 'while', 'parameter', 'localparam') and sig in declared_signals:
                driver = current_block_id if in_always else f"assign_{ln}"
                driven_by.setdefault(sig, set()).add(driver)
                driven_signals_ln.setdefault(sig, []).append(ln)

        # Continuous assign statements
        cont_m = re.match(r'\bassign\s+([a-zA-Z_]\w*)', clean_raw)
        if cont_m:
            sig = cont_m.group(1)
            if sig in declared_signals:
                driver = f"assign_{ln}"
                driven_by.setdefault(sig, set()).add(driver)
                driven_signals_ln.setdefault(sig, []).append(ln)

        # FSM state detection
        fsm_m = re.findall(r"parameter\s+(\w*(?:IDLE|INIT|STATE|ST_|FSM)\w*)\s*=", clean_raw, re.I)
        for s in fsm_m:
            fsm_states.add(s)

        case_m = re.search(r'(\w+(?:IDLE|INIT|STATE|ST_|FSM)\w*)\s*:', clean_raw, re.I)
        if case_m:
            fsm_reached.add(case_m.group(1))

        # Reset reg collection
        if in_seq:
            if re.search(r'if\s*\(\s*(?:!?\w*rst\w*|!?\w*reset\w*|.*?\brst\b|.*?\breset\b)', clean_raw, re.I):
                reset_regs.update(extract_reset_block_registers(clean_lines, i + 1))
            m = re.match(r'\s*(\w+)(?:\[[^\]]*\])?\s*<=', clean_raw)
            if m:
                seq_regs.add(m.group(1))

        if should_terminate:
            in_always = False
            in_seq = False
            in_comb = False
            current_block_id = None

    # ── Initialize context
    ctx = RuleContext(
        code=code,
        clean_code=cleaned,
        lines=lines,
        clean_lines=clean_lines,
        declared_signals=declared_signals,
        used_signals=used_signals,
        driven_by=driven_by,
        seq_regs=seq_regs,
        reset_regs=reset_regs,
        fsm_states=fsm_states,
        fsm_reached=fsm_reached,
        current_module=current_module,
        line_to_block_id=line_to_block_id,
        line_to_in_seq=line_to_in_seq,
        line_to_in_comb=line_to_in_comb,
        line_to_in_always=line_to_in_always
    )
    ctx.memory_arrays = memory_arrays

    # ── Execute 100+ Rules
    issues = []
    for rule in rules_list:
        try:
            rule_issues = rule.check(ctx)
            issues.extend(rule_issues)
        except Exception as e:
            print(f"[Warning] Rule {rule.rule_id} check failed: {e}")

    # Standard syntax sanity checks
    if not code.strip():
        issues.append({
            "ruleId": "SYN-000",
            "ruleName": "Empty File Violation",
            "category": "Syntax Errors",
            "severity": "error",
            "description": "Uploaded Verilog design is empty.",
            "why": "No code content to synthesize.",
            "recommendedFix": "Insert synthesizable module code.",
            "confidence": 99,
            "lineNum": 1,
            "message": "Empty file uploaded.",
            "codeSnippet": ""
        })

    # Sort issues by line number
    issues.sort(key=lambda x: x.get("lineNum", 1))

    # Legacy output adaptation
    for idx, iss in enumerate(issues):
        iss["id"] = f"issue_{idx+1:03d}"
        # Adapter mapping to standard keys
        iss["codeSnippet"] = iss.get("codeSnippet", "")
        iss["recommendation"] = iss.get("recommendedFix", "")
        iss["bugType"] = iss.get("ruleId", "generic")

    return {
        "issues": issues,
        "stats": {
            "errors": sum(1 for i in issues if i["severity"] == "error"),
            "warnings": sum(1 for i in issues if i["severity"] == "warning"),
            "info": sum(1 for i in issues if i["severity"] == "info"),
            "total": len(issues)
        }
    }


# ─────────────────────────────────────────────
# Upgraded Quality Scorer
# ─────────────────────────────────────────────

def compute_quality_scores(code: str, issues: List[Dict]) -> Dict:
    errors   = sum(1 for i in issues if i["severity"] == "error")
    warnings = sum(1 for i in issues if i["severity"] == "warning")
    info     = sum(1 for i in issues if i["severity"] == "info")

    # Compliance segments
    quality = max(0, min(100, 100 - errors * 15 - warnings * 7 - info * 2))
    security = max(0, min(100, 100 - sum(20 for i in issues if i.get("category") == "Security Checks")))
    performance = max(0, min(100, 100 - sum(12 for i in issues if i.get("category") == "Clock Domain Crossing (CDC)")))
    power = max(0, min(100, 100 - sum(15 for i in issues if i.get("category") == "Power Optimization")))
    standards = max(0, min(100, 100 - sum(5 for i in issues if i.get("category") == "Coding Style")))
    maintainability = max(0, min(100, 100 - sum(8 for i in issues if i.get("category") == "Unused Signals")))
    synthesizability = max(0, min(100, 100 - sum(15 for i in issues if i.get("category") == "Syntax Errors")))

    overall = round(
        quality * 0.20 +
        synthesizability * 0.20 +
        security * 0.15 +
        performance * 0.15 +
        power * 0.10 +
        standards * 0.10 +
        maintainability * 0.10
    )

    return {
        "overall": overall,
        "quality": quality,
        "security": security,
        "performance": performance,
        "power": power,
        "standards": standards,
        "maintainability": maintainability,
        "synthesizability": synthesizability
    }


# ─────────────────────────────────────────────
# Metrics Engine
# ─────────────────────────────────────────────

def compute_rtl_metrics(code: str) -> Dict[str, Any]:
    cleaned = clean_code(code)
    lines = get_lines(code)
    
    # Simple netlist parser counts
    inputs = len(re.findall(r'\binput\b', cleaned))
    outputs = len(re.findall(r'\boutput\b', cleaned))
    registers = len(re.findall(r'\breg\b', cleaned))
    wires = len(re.findall(r'\bwire\b', cleaned))
    always_blocks = len(re.findall(r'\balways\b', cleaned))
    assigns = len(re.findall(r'\bassign\b', cleaned))
    modules = len(re.findall(r'\bmodule\b', cleaned))
    cases = len(re.findall(r'\bcase\b', cleaned))
    clks = len(set(re.findall(r'\b\w*clk\w*\b|\bclk\b', cleaned, re.I)))
    resets = len(set(re.findall(r'\b\w*rst\w*\b|\brst\b|\breset\b', cleaned, re.I)))
    fsm_counts = len(re.findall(r'parameter\s+FSM.*=\s*\d+', cleaned, re.I))

    # Cyclomatic Complexity: decision points + 1
    decisions = (
        len(re.findall(r'\bif\b', cleaned)) +
        len(re.findall(r'\belse\s+if\b', cleaned)) +
        len(re.findall(r'\bcase\b', cleaned)) +
        len(re.findall(r'\b\?\b', cleaned))
    )
    complexity = decisions + 1

    return {
        "linesOfCode": len(lines),
        "modules": max(1, modules) if "module" in cleaned else 0,
        "inputs": inputs,
        "outputs": outputs,
        "registers": registers,
        "wires": wires,
        "alwaysBlocks": always_blocks,
        "assignStatements": assigns,
        "fsmCount": fsm_counts,
        "caseStatements": cases,
        "clockSignals": max(1, clks) if "clk" in cleaned.lower() else clks,
        "resetSignals": max(1, resets) if "rst" in cleaned.lower() or "reset" in cleaned.lower() else resets,
        "cyclomaticComplexity": complexity
    }


# ─────────────────────────────────────────────
# Bug Statistics Engine
# ─────────────────────────────────────────────

def compute_bug_statistics(issues: List[Dict[str, Any]]) -> Dict[str, Any]:
    critical = sum(1 for i in issues if i["severity"] == "error")
    high = sum(1 for i in issues if i["severity"] == "warning")
    medium = sum(1 for i in issues if i["severity"] == "warning" and i.get("confidence", 90) < 90)
    low = sum(1 for i in issues if i["severity"] == "info")
    info = sum(1 for i in issues if i["severity"] == "info" and i.get("confidence", 90) < 90)
    
    total = len(issues)
    auto_fixable = sum(1 for i in issues if i.get("autoFixHint"))
    
    # Estimated quality recovery metric
    improvement = round(auto_fixable * 8.5) if total > 0 else 0

    return {
        "critical": critical,
        "high": high,
        "medium": medium,
        "low": low,
        "info": info,
        "totalErrors": critical,
        "totalWarnings": high + medium,
        "autoFixAvailable": auto_fixable,
        "estimatedImprovement": min(100, improvement)
    }


# ─────────────────────────────────────────────
# Intelligent RTL Auto-Correct Engine
# ─────────────────────────────────────────────

def insert_missing_begin_end(code: str, add_log) -> str:
    """Pre-pass to wrap single/multiple statements under always/if/else without begin/end."""
    lines = code.split('\n')
    num_lines = len(lines)
    repaired_lines = list(lines)
    
    def get_indent(l: str) -> int:
        return len(l) - len(l.lstrip())

    idx = 0
    while idx < num_lines:
        line = repaired_lines[idx]
        stripped = line.strip()
        
        # Check if line is a control statement (always, if, else) and lacks "begin"
        is_always = re.search(r'\balways\s*(@|\b)', stripped, re.I)
        is_if = re.search(r'\bif\s*\(', stripped)
        is_else = re.search(r'\belse\b', stripped) and not re.search(r'\bif\b', stripped)
        
        if (is_always or is_if or is_else) and not re.search(r'\bbegin\b', stripped):
            # Find the next non-empty line
            next_idx = idx + 1
            while next_idx < num_lines and not repaired_lines[next_idx].strip():
                next_idx += 1
            
            if next_idx < num_lines:
                next_line = repaired_lines[next_idx]
                next_stripped = next_line.strip()
                
                # If it already starts with "begin", it's fine!
                if not next_stripped.startswith('begin'):
                    control_indent = get_indent(line)
                    first_statement_indent = get_indent(next_line)
                    
                    block_lines_indices = []
                    block_idx = next_idx
                    
                    if first_statement_indent > control_indent:
                        while block_idx < num_lines:
                            bl = repaired_lines[block_idx]
                            bl_stripped = bl.strip()
                            if not bl_stripped:
                                block_lines_indices.append(block_idx)
                                block_idx += 1
                                continue
                            
                            # Stop if we hit endmodule, always, or a line with indent <= control_indent
                            if re.match(r'^\s*(endmodule|always|always_comb|always_ff|initial|assign)\b', bl_stripped):
                                break
                            if get_indent(bl) <= control_indent:
                                break
                            
                            block_lines_indices.append(block_idx)
                            block_idx += 1
                    else:
                        block_lines_indices = [next_idx]
                        block_idx = next_idx + 1
                    
                    # Remove trailing empty lines from the block
                    while block_lines_indices and not repaired_lines[block_lines_indices[-1]].strip():
                        block_lines_indices.pop()
                    
                    if block_lines_indices:
                        last_block_line_idx = block_lines_indices[-1]
                        
                        orig_control = repaired_lines[idx]
                        repaired_lines[idx] = orig_control.rstrip() + " begin"
                        
                        indent_str = " " * control_indent
                        repaired_lines[last_block_line_idx] = repaired_lines[last_block_line_idx].rstrip() + f"\n{indent_str}end"
                        
                        reason = f"Wrapped block statements in missing begin/end grouping."
                        add_log("LNT-020", idx + 1, orig_control, repaired_lines[idx], reason, "Missing Begin/End Blocks Added")
                        
                        temp_code = '\n'.join(repaired_lines)
                        repaired_lines = temp_code.split('\n')
                        num_lines = len(repaired_lines)
        idx += 1
        
    return '\n'.join(repaired_lines)


def fix_missing_resets(code: str, add_log) -> str:
    lines = code.split('\n')
    num_lines = len(lines)
    repaired_lines = list(lines)
    
    idx = 0
    while idx < num_lines:
        line = repaired_lines[idx]
        stripped = line.strip()
        
        is_seq_always = re.search(r'always\s*@\s*\(\s*(?:posedge|negedge).*?(?:rst|reset)', stripped, re.I)
        if is_seq_always:
            block_lines_indices = []
            block_idx = idx + 1
            depth = 0
            has_begin = False
            
            if 'begin' in stripped:
                depth = 1
                has_begin = True
            
            while block_idx < num_lines:
                bl = repaired_lines[block_idx].strip()
                if not has_begin:
                    if 'begin' in bl:
                        has_begin = True
                        depth = 1
                    elif ';' in bl:
                        block_lines_indices.append(block_idx)
                        break
                else:
                    begins = bl.count('begin')
                    ends = bl.count('end')
                    depth += begins - ends
                    block_lines_indices.append(block_idx)
                    if depth <= 0:
                        break
                block_idx += 1
                
            reset_if_idx = -1
            reset_var = None
            is_active_high = True
            
            for b_idx in block_lines_indices:
                if b_idx >= len(repaired_lines):
                    continue
                bl = repaired_lines[b_idx].strip()
                m = re.search(r'if\s*\(\s*(!?|~?)\s*(\w*rst\w*|\w*reset\w*)\s*(?:==\s*\d+\'?\w*)?\s*\)', bl, re.I)
                if m:
                    reset_if_idx = b_idx
                    prefix = m.group(1)
                    reset_var = m.group(2)
                    is_active_high = ('!' not in prefix and '~' not in prefix)
                    break
                    
            if reset_if_idx != -1:
                reset_if_line = repaired_lines[reset_if_idx]
                reset_block_indices = []
                else_block_indices = []
                
                r_idx = reset_if_idx + 1
                has_r_begin = False
                r_depth = 0
                if 'begin' in reset_if_line:
                    has_r_begin = True
                    r_depth = 1
                
                while r_idx < num_lines:
                    r_line = repaired_lines[r_idx]
                    r_stripped = r_line.strip()
                    if not has_r_begin:
                        if 'begin' in r_stripped:
                            has_r_begin = True
                            r_depth = 1
                        else:
                            reset_block_indices.append(r_idx)
                            if ';' in r_stripped:
                                break
                    else:
                        begins = r_stripped.count('begin')
                        ends = r_stripped.count('end')
                        r_depth += begins - ends
                        reset_block_indices.append(r_idx)
                        if r_depth <= 0:
                            break
                    r_idx += 1
                    
                else_idx = r_idx + 1
                while else_idx < num_lines and not repaired_lines[else_idx].strip():
                    else_idx += 1
                
                if else_idx < num_lines and 'else' in repaired_lines[else_idx]:
                    else_line = repaired_lines[else_idx]
                    has_e_begin = False
                    e_depth = 0
                    if 'begin' in else_line:
                        has_e_begin = True
                        e_depth = 1
                    
                    e_idx = else_idx + 1
                    while e_idx < num_lines:
                        e_line = repaired_lines[e_idx]
                        e_stripped = e_line.strip()
                        if not has_e_begin:
                            if 'begin' in e_stripped:
                                has_e_begin = True
                                e_depth = 1
                            else:
                                else_block_indices.append(e_idx)
                                if ';' in e_stripped:
                                    break
                        else:
                            begins = e_stripped.count('begin')
                            ends = e_stripped.count('end')
                            e_depth += begins - ends
                            else_block_indices.append(e_idx)
                            if e_depth <= 0:
                                break
                        e_idx += 1
                
                reset_assigned = set()
                else_assigned = set()
                assign_pat = r'\b([a-zA-Z_]\w*)\s*(?:<=|=)'
                
                for r_idx in reset_block_indices:
                    for m in re.finditer(assign_pat, repaired_lines[r_idx]):
                        reset_assigned.add(m.group(1))
                        
                for e_idx in else_block_indices:
                    for m in re.finditer(assign_pat, repaired_lines[e_idx]):
                        else_assigned.add(m.group(1))
                
                unreset = else_assigned - reset_assigned
                
                memory_arrays = set()
                for e_idx in else_block_indices:
                    for m in re.finditer(r'\b([a-zA-Z_]\w*)\s*\[', repaired_lines[e_idx]):
                        memory_arrays.add(m.group(1))
                        
                unreset = unreset - memory_arrays
                
                if unreset:
                    insert_idx = -1
                    indent = ""
                    
                    if 'begin' in reset_if_line:
                        insert_idx = reset_if_idx + 1
                        indent = " " * (len(repaired_lines[insert_idx]) - len(repaired_lines[insert_idx].lstrip()))
                        if not indent:
                            indent = " " * (len(reset_if_line) - len(reset_if_line.lstrip()) + 4)
                    else:
                        if reset_block_indices:
                            stmt_idx = reset_block_indices[0]
                            stmt_line = repaired_lines[stmt_idx]
                            stmt_indent = " " * (len(stmt_line) - len(stmt_line.lstrip()))
                            
                            repaired_lines[reset_if_idx] = reset_if_line.rstrip() + " begin"
                            repaired_lines[stmt_idx] = stmt_line + f"\n{stmt_indent}end"
                            temp_code = '\n'.join(repaired_lines)
                            repaired_lines = temp_code.split('\n')
                            num_lines = len(repaired_lines)
                            insert_idx = reset_if_idx + 1
                            indent = stmt_indent
                    
                    if insert_idx != -1:
                        for reg in sorted(unreset):
                            new_assignment = f"{indent}{reg} <= 0;"
                            repaired_lines.insert(insert_idx, new_assignment)
                            num_lines += 1
                            reason = f"Initialized sequential register '{reg}' on reset condition."
                            add_log("SEQ-002", reset_if_idx + 1, reset_if_line, new_assignment, reason, "Reset Assignments Inserted")
                            insert_idx += 1
                            
        idx += 1
        
    return '\n'.join(repaired_lines)


def auto_repair_rtl(code: str) -> tuple[str, list[dict], dict]:
    """
    Main auto-correct pipeline that parses and repairs common Verilog coding errors.
    Returns: (corrected_code, fix_log, fix_summary)
    """
    fix_log = []
    
    # Track statistics
    summary = {
        "Blocking Assignments Fixed": 0,
        "Non-blocking Assignments Fixed": 0,
        "Missing Semicolons Inserted": 0,
        "Unbalanced Parentheses Balanced": 0,
        "Unbalanced Brackets Balanced": 0,
        "Unused Signals Removed": 0,
        "Duplicate Declarations Removed": 0,
        "Default Cases Added": 0,
        "Sensitivity Lists Normalized": 0,
        "Unreachable Code Removed": 0,
        "Default Combinational Assignments Added": 0,
        "Reset Assignments Inserted": 0,
        "Missing Begin/End Blocks Added": 0,
        "Standardized Formatting Applied": 0
    }

    # Helper to add log entries
    def add_log(rule_id, line_num, original, corrected, reason, category_key):
        fix_log.append({
            "ruleId": rule_id,
            "lineNum": line_num,
            "original": original.strip(),
            "corrected": corrected.strip(),
            "reason": reason
        })
        summary[category_key] = summary.get(category_key, 0) + 1

    # Apply missing begin/end pre-pass
    code = insert_missing_begin_end(code, add_log)
    code = fix_missing_resets(code, add_log)
    lines = code.split('\n')

    # First pre-analysis to gather variable declarations and usage
    analysis = detect_all(code)
    issues = analysis["issues"]
    stats = analysis["stats"]
    
    # We retrieve declared, used, and driven registers from detect_all context logic
    # To run safe fixes, let's identify unused signals
    unused_sigs = set()
    declared_sigs = set()
    for issue in issues:
        if issue.get("ruleId") == "LNT-001":  # Unused Signal Declaration
            # Extract signal name from the message
            m = re.search(r"Signal '(\w+)'", issue.get("message", ""))
            if m:
                unused_sigs.add(m.group(1))

    # We also trace sequential vs combinational lines
    # We rebuild block context line-by-line during the repair pass
    in_seq = False
    in_comb = False
    in_always = False
    block_depth = 0
    has_begin = False
    
    repaired_lines = []
    declared_seen = set()

    in_module_header = False

    for idx, raw in enumerate(lines):
        line = raw.strip()
        ln = idx + 1
        
        # Track module header
        if re.search(r'\bmodule\b', line):
            in_module_header = True
            
        # Split comments to avoid modifying them or placing semicolons inside them
        comment = ""
        code_part = raw
        if '//' in raw:
            code_part, comment_text = raw.split('//', 1)
            comment = '//' + comment_text
            
        line_code = code_part.strip()

        # 1. Skip completely empty lines to normalize whitespace
        if not line and idx > 0 and idx < len(lines) - 1 and not lines[idx-1].strip():
            # Don't add multiple blank lines
            continue

        # 2. Duplicate declaration removal
        decl_m = re.match(r'^\s*(reg|wire|logic)\s*(?:\[[^\]]+\])?\s*([a-zA-Z_]\w*)\s*;', raw)
        if decl_m:
            sig_name = decl_m.group(2)
            if sig_name in declared_seen:
                add_log("SYN-011", ln, raw, "", f"Removed duplicate declaration of signal '{sig_name}'.", "Duplicate Declarations Removed")
                continue
            declared_seen.add(sig_name)

        # 3. Unused wires and registers removal
        if decl_m:
            sig_name = decl_m.group(2)
            if sig_name in unused_sigs and sig_name not in ('clk', 'rst', 'reset', 'en'):
                add_log("LNT-001", ln, raw, f"// {raw.strip()} // Removed unused", f"Removed unused signal declaration '{sig_name}'.", "Unused Signals Removed")
                repaired_lines.append(f"// {raw} // Removed unused")
                continue

        # ── Always block tracking ──
        if re.search(r'\balways\s*@', raw, re.I) or raw.strip().startswith('always_comb') or raw.strip().startswith('always_ff'):
            in_always = True
            block_depth = 0
            has_begin = False
            
            if re.search(r'\bbegin\b', raw):
                block_depth = 1
                has_begin = True

            if re.search(r'always\s*@\s*\(.*(?:posedge|negedge)', raw, re.I) or raw.strip().startswith('always_ff'):
                in_seq, in_comb = True, False
            else:
                in_comb, in_seq = True, False
        else:
            if in_always:
                begins = len(re.findall(r'\bbegin\b', raw))
                ends = len(re.findall(r'\bend\b', raw))
                if not has_begin and begins > 0:
                    has_begin = True
                    block_depth = begins - ends
                elif has_begin:
                    block_depth += begins - ends
                
                if has_begin and block_depth <= 0:
                    in_always = False
                    in_seq = False
                    in_comb = False
                elif not has_begin and ';' in raw:
                    # Single statement always block check
                    # Check if next line is not 'else' to avoid early termination
                    next_is_else = False
                    if idx + 1 < len(lines) and lines[idx+1].strip().startswith('else'):
                        next_is_else = True
                    if not next_is_else:
                        in_always = False
                        in_seq = False
                        in_comb = False

        # 4. Semicolon Insertion
        if not in_module_header:
            # Check if line contains assignment but missing semicolon
            if re.search(r'\b\w+\s*(?:<=|=)\s*[^;]+$', line_code) and not line_code.endswith(';') and not re.search(r'\b(if|else|case|always|begin)\b', line_code):
                corrected_code_part = code_part.rstrip() + ";"
                corrected = corrected_code_part + comment
                add_log("SYN-001", ln, raw, corrected, "Inserted missing terminating semicolon.", "Missing Semicolons Inserted")
                raw = corrected
                code_part = corrected_code_part
                line_code = code_part.strip()
                line = raw.strip()
            # Check if line is a declaration but missing semicolon
            elif re.match(r'^\s*(reg|wire|logic|input|output)\s+[^;]+$', line_code) and not line_code.endswith(';') and not re.search(r'\b(module|always|if|else|begin|end)\b', line_code):
                corrected_code_part = code_part.rstrip() + ";"
                corrected = corrected_code_part + comment
                add_log("SYN-001", ln, raw, corrected, "Inserted missing terminating semicolon for declaration.", "Missing Semicolons Inserted")
                raw = corrected
                code_part = corrected_code_part
                line_code = code_part.strip()
                line = raw.strip()

        # 5. Unbalanced Parentheses and Brackets
        if not in_module_header:
            open_p = code_part.count('(')
            close_p = code_part.count(')')
            if open_p > close_p and not line_code.endswith('('):
                corrected_code_part = code_part.rstrip() + (")" * (open_p - close_p))
                corrected = corrected_code_part + comment
                add_log("SYN-002", ln, raw, corrected, "Balanced unmatched parentheses.", "Unbalanced Parentheses Balanced")
                raw = corrected
                code_part = corrected_code_part
                line_code = code_part.strip()
                line = raw.strip()
                
            open_b = code_part.count('[')
            close_b = code_part.count(']')
            if open_b > close_b and not line_code.endswith('['):
                corrected_code_part = code_part.rstrip() + ("]" * (open_b - close_b))
                corrected = corrected_code_part + comment
                add_log("SYN-012", ln, raw, corrected, "Balanced unmatched brackets.", "Unbalanced Brackets Balanced")
                raw = corrected
                code_part = corrected_code_part
                line_code = code_part.strip()
                line = raw.strip()

        # Track end of module header
        if in_module_header and (');' in line or (line.startswith(')') and ';' in line)):
            in_module_header = False

        # 6. Sensitivity list normalization (combinational blocks only, never clocked/sequential)
        if in_comb and not in_seq and re.search(r'always\s*@\s*\(\s*[a-zA-Z_]\w*(?:\s*(?:or|,)\s*[a-zA-Z_]\w*)+\s*\)', raw, re.I):
            corrected = re.sub(r'always\s*@\s*\(.*?\)', 'always @(*)', raw, flags=re.I)
            add_log("CMB-008", ln, raw, corrected, "Normalized incomplete combinational sensitivity list to 'always @(*)'.", "Sensitivity Lists Normalized")
            raw = corrected
            line = raw.strip()

        # 7. Blocking assignments inside clocked sequential blocks -> Non-blocking
        if in_seq and '=' in raw and '==' not in raw and '<=' not in raw and '!=' not in raw and '>=' not in raw and '<=' not in raw:
            # Match assignment pattern
            assign_m = re.search(r'(\b\w+)\s*=\s*([^;]+);', raw)
            if assign_m and assign_m.group(1) not in ('if', 'for', 'while', 'case', 'parameter', 'localparam'):
                corrected = raw.replace('=', '<=', 1)
                add_log("SEQ-001", ln, raw, corrected, "Replaced blocking assignment (=) with non-blocking assignment (<=) in sequential always block.", "Blocking Assignments Fixed")
                raw = corrected
                line = raw.strip()

        # 8. Non-blocking assignments inside combinational blocks -> Blocking
        if in_comb and '<=' in raw and '<==' not in raw:
            corrected = raw.replace('<=', '=')
            add_log("CMB-001", ln, raw, corrected, "Replaced non-blocking assignment (<=) with blocking assignment (=) in combinational always block.", "Non-blocking Assignments Fixed")
            raw = corrected
            line = raw.strip()

        # 9. Case default branch check
        if 'case' in line and 'endcase' not in line:
            # We track lines to find the endcase
            case_end_idx = -1
            has_default = False
            for j in range(idx + 1, min(idx + 50, len(lines))):
                if 'default' in lines[j]:
                    has_default = True
                if 'endcase' in lines[j]:
                    case_end_idx = j
                    break
            
            if case_end_idx != -1 and not has_default:
                # Add default branch right before endcase
                lines[case_end_idx] = "        default: ; // Auto-inserted safety default branch\n" + lines[case_end_idx]
                add_log("CMB-003", case_end_idx + 1, "endcase", "default: ; endcase", "Inserted missing default case statement to prevent inferred latches.", "Default Cases Added")

        # 10. Redundant assignments check (e.g. a = a;)
        redundant_m = re.match(r'^\s*(\w+)\s*=\s*\1\s*;', line)
        if redundant_m:
            add_log("LNT-011", ln, raw, "", "Removed redundant assignment (assigning signal to itself).", "Unreachable Code Removed")
            continue

        repaired_lines.append(raw)

    corrected_code = '\n'.join(repaired_lines)

    # 11. Indentation Standardization and formatting
    formatted_lines = []
    current_indent = 0
    for line in corrected_code.split('\n'):
        # Split comments to avoid keyword matching in comments
        code_part = line
        comment = ""
        if '//' in line:
            code_part, comment_text = line.split('//', 1)
            comment = '//' + comment_text
            
        stripped = code_part.strip()
        
        # If the code part is empty, but we have a comment, preserve the line with current indent
        if not stripped:
            if comment:
                formatted_lines.append(" " * current_indent + comment.strip())
            else:
                formatted_lines.append("")
            continue
            
        # Decrease indent for end/endcase/endmodule
        if re.match(r'^\s*(end|endcase|endmodule)\b', stripped):
            current_indent = max(0, current_indent - 4)
            
        formatted_lines.append(" " * current_indent + stripped + ("  " + comment.strip() if comment else ""))
        
        # Increase indent for module/begin/case/always
        if re.search(r'\b(begin|case|module)\b', stripped) or (stripped.startswith("always") and not stripped.endswith(";")):
            current_indent += 4

    corrected_code = '\n'.join(formatted_lines)
    summary["Standardized Formatting Applied"] = 1

    summary["Total Auto Fixes"] = sum(v for k, v in summary.items() if k != "Total Auto Fixes")
    
    return corrected_code, fix_log, summary


def generate_auto_fix(code: str, issues: List[Dict]) -> str:
    """Wrapper for backward compatibility, running the new auto-repair engine."""
    corrected, _, _ = auto_repair_rtl(code)
    return corrected



# ─────────────────────────────────────────────
# Fictional CDC / Signal Hierarchy Extractor
# ─────────────────────────────────────────────

def extract_hierarchy(code: str) -> Dict[str, Any]:
    cleaned = clean_code(code)
    mod_m = re.search(r'\bmodule\s+(\w+)', cleaned)
    module_name = mod_m.group(1) if mod_m else "unknown"

    ports = []
    for m in re.finditer(r'\b(input|output|inout)\s+(?:reg|wire|logic)?\s*(\[[^\]]+\])?\s*(\w+)\b', cleaned):
        ports.append({"direction": m.group(1), "width": m.group(2) or "", "name": m.group(3)})

    instances = []
    for m in re.finditer(r'\b(\w+)\s+(\w+)\s*\(', cleaned):
        mod_type, inst_name = m.group(1), m.group(2)
        if mod_type not in ('module', 'if', 'begin', 'always', 'assign', 'case', 'for',
                            'input', 'output', 'wire', 'reg', 'logic', 'endmodule'):
            instances.append({"type": mod_type, "instance": inst_name})

    states = re.findall(r'parameter\s+(\w+)\s*=\s*\d', cleaned)

    return {
        "moduleName": module_name,
        "ports": ports,
        "instances": instances,
        "states": states,
        "lineCount": len(code.split('\n'))
    }


def estimate_coverage(code: str) -> Dict[str, Any]:
    import random, hashlib
    seed = int(hashlib.md5(code[:100].encode()).hexdigest()[:8], 16)
    random.seed(seed)
    
    stmt = random.randint(80, 96)
    branch = random.randint(75, 92)
    toggle = random.randint(70, 88)
    fsm = random.randint(85, 100)
    func = random.randint(80, 95)
    overall = round((stmt + branch + toggle + fsm + func) / 5)

    return {
        "overall": overall,
        "statement": {"percentage": stmt, "covered": 85, "total": 100},
        "branch": {"percentage": branch, "covered": 80, "total": 100},
        "toggle": {"percentage": toggle, "covered": 75, "total": 100},
        "fsm": {"percentage": fsm, "covered": 90, "total": 100},
        "functional": {"percentage": func, "covered": 88, "total": 100}
    }


def chat_with_rtl_ai(message: str, rtl_context: str = "", issues_context: List[Dict] = None) -> str:
    # Simulates advanced linter help response
    return f"Based on your request: '{message}', let's trace code compliance rules. Refer to ACCELLERA standards for clock gating and asynchronous resets."
