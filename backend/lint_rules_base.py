"""
RTLGuard AI — Modular Lint Engine Base Classes
"""

from typing import List, Dict, Any, Set

class RuleContext:
    """Provides structured compilation context for lint rules."""
    def __init__(self, code: str, clean_code: str, lines: List[str], clean_lines: List[str],
                 declared_signals: Set[str], used_signals: Set[str], driven_by: Dict[str, Set[str]],
                 seq_regs: Set[str], reset_regs: Set[str], fsm_states: Set[str], fsm_reached: Set[str],
                 current_module: str, line_to_block_id: Dict[int, str], line_to_in_seq: Dict[int, bool],
                 line_to_in_comb: Dict[int, bool], line_to_in_always: Dict[int, bool]):
        self.code = code
        self.clean_code = clean_code
        self.lines = lines
        self.clean_lines = clean_lines
        self.declared_signals = declared_signals
        self.used_signals = usedSignals = used_signals
        self.driven_by = driven_by
        self.seq_regs = seq_regs
        self.reset_regs = reset_regs
        self.fsm_states = fsm_states
        self.fsm_reached = fsm_reached
        self.current_module = current_module
        self.line_to_block_id = line_to_block_id
        self.line_to_in_seq = line_to_in_seq
        self.line_to_in_comb = line_to_in_comb
        self.line_to_in_always = line_to_in_always

class BaseRule:
    """Base interface for all 100+ RTL lint rules."""
    rule_id = "RTL-000"
    name = "Base Rule"
    category = "Syntax"
    severity = "info"
    description = ""
    why_dangerous = ""
    recommended_fix = ""
    reference = "https://github.com/accellera-official"
    confidence = 90  # Fix confidence percentage

    def check(self, ctx: RuleContext) -> List[Dict[str, Any]]:
        """Override to inspect code and yield issue details."""
        return []

    def make_issue(self, line_num: int, message: str, code_snippet: str = "", recommendation: str = "", auto_fix_hint: str = "") -> Dict[str, Any]:
        return {
            "ruleId": self.rule_id,
            "ruleName": self.name,
            "category": self.category,
            "severity": self.severity,
            "description": self.description or message,
            "why": self.why_dangerous,
            "recommendedFix": self.recommended_fix or recommendation,
            "confidence": self.confidence,
            "reference": self.reference,
            "lineNum": line_num,
            "message": message,
            "codeSnippet": code_snippet.strip()[:120] if code_snippet else "",
            "autoFixHint": auto_fix_hint
        }
