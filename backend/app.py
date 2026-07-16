"""
RTLGuard AI — Flask Backend (Enhanced v2.0)
MongoDB Atlas | AI Analysis | Chat | Coverage | ZIP | Export
"""

import os
import re
import json
import zipfile
import io
from datetime import datetime, timezone
from bson import ObjectId
from bson.errors import InvalidId

from flask import Flask, request, jsonify, send_from_directory, Response
from flask_cors import CORS
from pymongo import MongoClient, DESCENDING
import bcrypt

from testbench_engine import (
    parse_verilog, generate_testbench, generate_assertions,
    generate_coverage, predict_waveform, generate_documentation, compute_scores
)
from rtl_analysis_engine import (
    detect_all, compute_quality_scores, generate_auto_fix,
    estimate_coverage, chat_with_rtl_ai, extract_hierarchy,
    compute_rtl_metrics, compute_bug_statistics, auto_repair_rtl
)
from lint_rules_collection import explain_bug, rules_list

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

MONGO_URI  = os.getenv("MONGO_URI")
SECRET_KEY = os.getenv("SECRET_KEY", "rtlguard-secret-key-2026")
PORT       = int(os.getenv("PORT", 5000))
GEMINI_KEY = os.getenv("GEMINI_API_KEY", "")

# ─────────────────────────────────────────────
# Flask App
# ─────────────────────────────────────────────
app = Flask(__name__)
app.config["SECRET_KEY"] = SECRET_KEY
CORS(app, resources={r"/api/*": {"origins": "*"}})

# ─────────────────────────────────────────────
# MongoDB
# ─────────────────────────────────────────────
try:
    client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=10000)
    client.admin.command("ping")
    db = client["rtlguard_db"]
    print("[OK] MongoDB Atlas connected - rtlguard_db")
except Exception as e:
    print(f"[ERROR] MongoDB connection failed: {e}")
    db = None

def users_col():   return db["users"]
def files_col():   return db["rtl_files"]
def runs_col():    return db["analysis_runs"]
def chats_col():   return db["chat_sessions"]

# ─────────────────────────────────────────────
# Utilities
# ─────────────────────────────────────────────
def now():
    return datetime.now(timezone.utc)

def serial(doc):
    if doc is None:
        return None
    doc["_id"] = str(doc["_id"])
    for k in ("user_id", "file_id"):
        if k in doc and isinstance(doc[k], ObjectId):
            doc[k] = str(doc[k])
    return doc

def to_oid(s):
    try:
        return ObjectId(s)
    except Exception:
        return None

def ok(data=None, msg="OK", code=200):
    p = {"success": True, "message": msg}
    if data is not None:
        p["data"] = data
    return jsonify(p), code

def err(msg, code=400):
    return jsonify({"success": False, "error": msg}), code

# ─────────────────────────────────────────────
# Core RTL Analysis (Enhanced v3.0)
# ─────────────────────────────────────────────
def analyze_rtl(content: str) -> dict:
    """Full RTL analysis with 100+ lint rules and 8-dimension scoring."""
    result = detect_all(content)
    issues = result["issues"]
    scores = compute_quality_scores(content, issues)
    suggestions = []

    if any(i["severity"] == "warning" for i in issues):
        suggestions.append({"title": "Audit Assignments",
                             "description": "Review blocking vs non-blocking assignments throughout the design.",
                             "impact": "HIGH"})
    if any("latch" in i.get("message", "").lower() for i in issues):
        suggestions.append({"title": "Eliminate Inferred Latches",
                             "description": "Add default assignments before all if-else trees in combinational blocks.",
                             "impact": "HIGH"})
    if any("reset" in i.get("message", "").lower() for i in issues):
        suggestions.append({"title": "Add Reset Logic",
                             "description": "All sequential elements should have explicit synchronous or asynchronous reset.",
                             "impact": "HIGH"})
    if scores.get("synthesizability", 100) < 80:
        suggestions.append({"title": "Improve Synthesizability",
                             "description": "Remove non-synthesizable constructs: initial blocks, delays (#N), $display calls.",
                             "impact": "CRITICAL"})
    if scores.get("maintainability", 100) < 70:
        suggestions.append({"title": "Improve Maintainability",
                             "description": "Add comments, use localparams instead of magic numbers, and follow naming conventions.",
                             "impact": "MEDIUM"})

    return {"scores": scores, "issues": issues, "suggestions": suggestions, "stats": result["stats"]}

def log_run(file_id, user_id, analysis, ts):
    if db is None:
        return
    runs_col().insert_one({
        "file_id":     file_id,
        "user_id":     user_id,
        "scores":      analysis["scores"],
        "issue_count": len(analysis["issues"]),
        "run_at":      ts
    })

# ════════════════════════════════════════════════
# HEALTH
# ════════════════════════════════════════════════
@app.route("/api/health")
def health():
    return ok({
        "db":     "connected" if db is not None else "disconnected",
        "server": "RTLGuard AI v3.0 — Lint Engine",
        "gemini": "enabled" if GEMINI_KEY else "rule-based",
        "rulesCount": len(rules_list)
    })

# ════════════════════════════════════════════════
# AUTH
# ════════════════════════════════════════════════
@app.route("/api/auth/register", methods=["POST"])
def register():
    if db is None: return err("DB unavailable", 503)
    b = request.get_json(silent=True) or {}
    name     = (b.get("name") or "").strip()
    email    = (b.get("email") or "").strip().lower()
    password = (b.get("password") or "").strip()
    role     = (b.get("role") or "RTL Design Engineer").strip()

    if not name or not email or not password:
        return err("name, email and password are required")
    if not re.match(r"[^@]+@[^@]+\.[^@]+", email):
        return err("Invalid email")
    if len(password) < 6:
        return err("Password must be at least 6 characters")
    if users_col().find_one({"email": email}):
        return err("Email already registered", 409)

    pw_hash = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()
    ts = now()
    res = users_col().insert_one({
        "name": name, "email": email, "password_hash": pw_hash,
        "role": role, "avatar": None, "created_at": ts, "last_login": ts,
        "theme": "dark"
    })
    return ok({"userId": str(res.inserted_id), "name": name, "email": email,
               "role": role, "avatar": None, "theme": "dark"},
              "Registered successfully", 201)


@app.route("/api/auth/login", methods=["POST"])
def login():
    if db is None: return err("DB unavailable", 503)
    b = request.get_json(silent=True) or {}
    email    = (b.get("email") or "").strip().lower()
    password = (b.get("password") or "").strip()

    if not email or not password:
        return err("email and password required")

    user = users_col().find_one({"email": email})
    if not user or not bcrypt.checkpw(password.encode(), user["password_hash"].encode()):
        return err("Invalid email or password", 401)

    users_col().update_one({"_id": user["_id"]}, {"$set": {"last_login": now()}})
    return ok({
        "userId": str(user["_id"]), "name": user["name"],
        "email": user["email"], "role": user.get("role", "RTL Design Engineer"),
        "avatar": user.get("avatar"), "theme": user.get("theme", "dark")
    }, "Login successful")


@app.route("/api/auth/profile", methods=["PUT"])
def update_profile():
    """Update user profile: name, role, avatar, theme."""
    if db is None: return err("DB unavailable", 503)
    b = request.get_json(silent=True) or {}
    user_id = to_oid(b.get("userId"))
    if not user_id: return err("Invalid userId")

    user = users_col().find_one({"_id": user_id})
    if not user: return err("User not found", 404)

    upd = {}
    if b.get("name"):   upd["name"]   = b["name"].strip()
    if b.get("role"):   upd["role"]   = b["role"].strip()
    if b.get("theme"):  upd["theme"]  = b["theme"].strip()
    if "avatar" in b:   upd["avatar"] = b["avatar"]  # allow null to clear

    if not upd:
        return err("No fields to update")

    users_col().update_one({"_id": user_id}, {"$set": upd})
    updated = users_col().find_one({"_id": user_id})
    return ok({
        "userId": str(updated["_id"]),
        "name":   updated["name"],
        "email":  updated["email"],
        "role":   updated.get("role", "RTL Design Engineer"),
        "avatar": updated.get("avatar"),
        "theme":  updated.get("theme", "dark")
    }, "Profile updated")


# ════════════════════════════════════════════════
# LINT RULES CATALOG
# ════════════════════════════════════════════════
@app.route("/api/rules", methods=["GET"])
def rules_catalog():
    """Return the full lint rules catalog for the frontend Rules Database page."""
    category_filter  = request.args.get("category", "").strip().lower()
    severity_filter  = request.args.get("severity", "").strip().lower()
    search_query     = request.args.get("q", "").strip().lower()

    catalog = []
    for rule in rules_list:
        entry = {
            "ruleId":      rule.rule_id,
            "name":        rule.name,
            "category":    rule.category,
            "severity":    rule.severity,
            "description": rule.description,
            "why":         rule.why_dangerous,
            "fix":         rule.recommended_fix,
            "confidence":  getattr(rule, 'confidence', 90)
        }
        # Apply filters
        if category_filter and rule.category.lower() != category_filter:
            continue
        if severity_filter and rule.severity.lower() != severity_filter:
            continue
        if search_query:
            haystack = f"{rule.rule_id} {rule.name} {rule.description} {rule.category}".lower()
            if search_query not in haystack:
                continue
        catalog.append(entry)

    # Build category stats
    all_categories = {}
    all_severities = {"error": 0, "warning": 0, "info": 0}
    for rule in rules_list:
        cat = rule.category
        all_categories[cat] = all_categories.get(cat, 0) + 1
        sev = rule.severity.lower()
        if sev in all_severities:
            all_severities[sev] += 1

    return ok({
        "rules":       catalog,
        "total":       len(rules_list),
        "filtered":    len(catalog),
        "categories":  all_categories,
        "severities":  all_severities
    })


# ════════════════════════════════════════════════
# PLATFORM STATISTICS
# ════════════════════════════════════════════════
@app.route("/api/stats", methods=["GET"])
def platform_stats():
    """Return global platform statistics."""
    if db is None:
        return ok({
            "totalUsers": 0, "totalFiles": 0, "totalRuns": 0,
            "totalIssuesFixed": 0, "rulesCount": len(rules_list),
            "avgQualityScore": 0
        })

    try:
        total_users = users_col().count_documents({})
        total_files = files_col().count_documents({})
        total_runs  = runs_col().count_documents({})

        # Compute avg quality across all files
        all_files = list(files_col().find({}, {"analysis_result.scores.overall": 1}))
        scores = [f.get("analysis_result", {}).get("scores", {}).get("overall", 0) for f in all_files]
        avg_score = round(sum(scores) / len(scores)) if scores else 0

        # Top categories of issues
        pipeline = [
            {"$unwind": "$analysis_result.issues"},
            {"$group": {"_id": "$analysis_result.issues.severity", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}}
        ]
        issue_breakdown = {d["_id"]: d["count"] for d in files_col().aggregate(pipeline)}

        return ok({
            "totalUsers":      total_users,
            "totalFiles":      total_files,
            "totalRuns":       total_runs,
            "rulesCount":      len(rules_list),
            "avgQualityScore": avg_score,
            "issueBreakdown":  issue_breakdown
        })
    except Exception as e:
        return err(f"Stats failed: {str(e)}", 500)


# ════════════════════════════════════════════════
# RTL FILES
# ════════════════════════════════════════════════
@app.route("/api/files", methods=["GET"])
def get_files():
    if db is None: return err("DB unavailable", 503)
    uid = to_oid(request.args.get("userId"))
    if not uid: return err("Invalid userId")
    docs = list(files_col().find({"user_id": uid}, sort=[("updated_at", DESCENDING)]))
    return ok([serial(f) for f in docs])


@app.route("/api/files", methods=["POST"])
def create_file():
    if db is None: return err("DB unavailable", 503)
    b = request.get_json(silent=True) or {}
    uid     = to_oid(b.get("userId"))
    name    = (b.get("name") or "untitled.v").strip()
    content = b.get("content") or ""
    if not uid:     return err("Invalid userId")
    if not content: return err("Content cannot be empty")

    # Automatically apply safe fixes on creation
    corrected_code, fix_log, auto_fix_summary = auto_repair_rtl(content)
    analysis = analyze_rtl(corrected_code)
    
    ts = now()
    res = files_col().insert_one({
        "user_id": uid, 
        "name": name, 
        "content": corrected_code,
        "original_content": content,
        "fix_log": fix_log,
        "auto_fix_summary": auto_fix_summary,
        "analysis_result": analysis, 
        "created_at": ts, 
        "updated_at": ts
    })
    log_run(res.inserted_id, uid, analysis, ts)
    doc = files_col().find_one({"_id": res.inserted_id})
    return ok(serial(doc), "File created", 201)


@app.route("/api/files/<fid>", methods=["PUT"])
def update_file(fid):
    if db is None: return err("DB unavailable", 503)
    foid = to_oid(fid)
    if not foid: return err("Invalid file ID", 404)
    b = request.get_json(silent=True) or {}
    content, name = b.get("content"), b.get("name")
    if content is None and name is None:
        return err("Provide content or name to update")

    existing = files_col().find_one({"_id": foid})
    if not existing: return err("File not found", 404)

    upd = {"updated_at": now()}
    if name:    upd["name"] = name.strip()
    if content is not None:
        # Automatically apply safe fixes on update
        corrected_code, fix_log, auto_fix_summary = auto_repair_rtl(content)
        analysis = analyze_rtl(corrected_code)
        
        upd["content"] = corrected_code
        upd["original_content"] = content
        upd["fix_log"] = fix_log
        upd["auto_fix_summary"] = auto_fix_summary
        upd["analysis_result"] = analysis
        log_run(foid, existing.get("user_id"), analysis, upd["updated_at"])

    files_col().update_one({"_id": foid}, {"$set": upd})
    return ok(serial(files_col().find_one({"_id": foid})), "File updated")


@app.route("/api/files/<fid>", methods=["DELETE"])
def delete_file(fid):
    if db is None: return err("DB unavailable", 503)
    foid = to_oid(fid)
    if not foid: return err("Invalid file ID", 404)
    res = files_col().delete_one({"_id": foid})
    if res.deleted_count == 0: return err("File not found", 404)
    runs_col().delete_many({"file_id": foid})
    return ok(None, "File deleted")


@app.route("/api/files/<fid>/history", methods=["GET"])
def file_history(fid):
    if db is None: return err("DB unavailable", 503)
    foid = to_oid(fid)
    if not foid: return err("Invalid file ID", 404)
    runs = list(runs_col().find({"file_id": foid}, sort=[("run_at", DESCENDING)], limit=50))
    return ok([serial(r) for r in runs])

# ════════════════════════════════════════════════
# ════════════════════════════════════════════════
# HELPER FUNCTIONS FOR GEMINI RESPONSE CLEANING
# ════════════════════════════════════════════════
def clean_gemini_json_response(text: str) -> str:
    text = text.strip()
    if text.startswith("```"):
        lines = text.splitlines()
        if lines[0].startswith("```"):
            lines = lines[1:]
        if lines and lines[-1].startswith("```"):
            lines = lines[:-1]
        text = "\n".join(lines).strip()
    return text

def clean_gemini_verilog_response(text: str) -> str:
    return clean_gemini_json_response(text)


# ════════════════════════════════════════════════
# ENHANCED ANALYSIS ENDPOINT (v3.0 — Lint Platform)
# ════════════════════════════════════════════════
@app.route("/api/analyze", methods=["POST"])
def enhanced_analyze():
    """Enhanced analysis with 100+ rules, AI-powered auto-repair, and before/after verification."""
    b = request.get_json(silent=True) or {}
    code = b.get("code") or b.get("content") or ""
    gemini_key = b.get("geminiKey") or b.get("apiKey") or GEMINI_KEY
    if not code.strip():
        return err("RTL code is required")

    try:
        # Step 1: Run the linter on original code
        before_analysis = analyze_rtl(code)
        original_issues = before_analysis["issues"]
        original_score = before_analysis["scores"].get("overall", 100)

        # Step 2: Send BOTH the RTL code and lint results to the Gemini AI Auto-Fix engine
        corrected_code = None
        ai_fixes = []

        if gemini_key:
            try:
                import google.generativeai as genai
                genai.configure(api_key=gemini_key)
                model = genai.GenerativeModel('gemini-pro')
                prompt = f"""You are an expert Silicon Design and RTL Verification Engineer.
Your task is to fix all code quality, syntax, synthesizability, timing, and design rules issues in this Verilog/SystemVerilog module.

Original RTL code:
```verilog
{code}
```

Linter findings:
{json.dumps(original_issues, indent=2)}

Please fix all the warnings/errors. In particular, address:
- Missing reset logic / uninitialized registers (SEQ-002)
- Inferred latches (SYN-001)
- Blocking assignments in sequential logic (SEQ-001)
- Missing default assignments in case/if branches (SYN-002)
- Missing sensitivity list entries (LNT-002)
- Gated clock domain crossings (CDC) and FSM state registers
- Style conventions, parameters, dead code, and unused signals

Ensure the returned Verilog code compiles, is fully synthesizable, and functionally correct.
You must return your output strictly in JSON format. Do not wrap the JSON in markdown code blocks or add text before/after. The JSON object must contain two fields:
1. "corrected_code": A single string containing the entire corrected Verilog code.
2. "fixes": A list of objects representing the fixes you applied. Each object must have:
   - "ruleId": The rule ID (e.g. "SEQ-002") of the issue being fixed.
   - "line": The original line number as an integer.
   - "description": A concise description of the fix (e.g. "Added async reset to register mem").
   - "before": The original code snippet replaced.
   - "after": The corrected code snippet.
   - "confidence": An integer confidence score from 0 to 100.
"""
                response = model.generate_content(prompt)
                if response and response.text:
                    cleaned_text = clean_gemini_json_response(response.text)
                    try:
                        data = json.loads(cleaned_text)
                        corrected_code = data.get("corrected_code")
                        ai_fixes = data.get("fixes", [])
                    except Exception as parse_err:
                        print(f"[AI Fix] Failed to parse JSON response: {parse_err}")
                        # Fallback: request only raw code
                        text_prompt = f"Fix the following Verilog code to resolve these linter issues: {json.dumps(original_issues)}. Return ONLY the corrected code.\nCode:\n{code}"
                        response_text = model.generate_content(text_prompt)
                        if response_text and response_text.text:
                            corrected_code = clean_gemini_verilog_response(response_text.text)
            except Exception as e:
                print(f"[AI Fix] Gemini API call failed: {e}")

        # Fallback to rule-based repair if Gemini failed or key not present
        if not corrected_code:
            corrected_code, rule_fix_log, _ = auto_repair_rtl(code)
            ai_fixes = []
            for item in rule_fix_log:
                ai_fixes.append({
                    "ruleId": item.get("ruleId"),
                    "line": item.get("lineNum"),
                    "description": item.get("reason"),
                    "before": item.get("original"),
                    "after": item.get("corrected"),
                    "confidence": 95
                })

        # Step 3: Run the linter AGAIN using the corrected RTL (Re-Lint)
        after_analysis = analyze_rtl(corrected_code)
        after_issues = after_analysis["issues"]

        # Step 4: Compare: Before Fix / After Fix to verify resolved issues
        resolved_fixes = []
        verified_remaining_issues = []
        unmatched_after = list(after_issues)

        for orig in original_issues:
            # Look for matching issue in unmatched_after
            match_idx = -1
            for idx, aft in enumerate(unmatched_after):
                if aft["ruleId"] == orig["ruleId"]:
                    if abs(aft["lineNum"] - orig["lineNum"]) <= 6:
                        match_idx = idx
                        break
            if match_idx != -1:
                # Issue still exists -> unresolved
                aft_item = unmatched_after.pop(match_idx)
                aft_item_copy = dict(aft_item)
                if not aft_item_copy["message"].startswith("[Manual review required]"):
                    aft_item_copy["message"] = f"[Manual review required] {aft_item_copy['message']}"
                verified_remaining_issues.append(aft_item_copy)
            else:
                # Resolved!
                ai_fix_entry = None
                for f in ai_fixes:
                    if f.get("ruleId") == orig["ruleId"] and abs(f.get("line", 0) - orig["lineNum"]) <= 6:
                        ai_fix_entry = f
                        break
                
                if ai_fix_entry:
                    resolved_fixes.append({
                        "rule": ai_fix_entry.get("ruleId", orig["ruleId"]),
                        "line": ai_fix_entry.get("line", orig["lineNum"]),
                        "description": ai_fix_entry.get("description", orig["message"]),
                        "before": ai_fix_entry.get("before", orig.get("codeSnippet", "")),
                        "after": ai_fix_entry.get("after", ""),
                        "confidence": ai_fix_entry.get("confidence", 95)
                    })
                else:
                    resolved_fixes.append({
                        "rule": orig["ruleId"],
                        "line": orig["lineNum"],
                        "description": f"Resolved: {orig['message']}",
                        "before": orig.get("codeSnippet", ""),
                        "after": orig.get("recommendation", ""),
                        "confidence": 90
                    })

        # Add newly introduced issues in after_issues (if any)
        for aft in unmatched_after:
            verified_remaining_issues.append(aft)

        # Recalculate metrics for corrected design
        after_scores = compute_quality_scores(corrected_code, verified_remaining_issues)
        after_stats = compute_bug_statistics(verified_remaining_issues)
        after_analysis["scores"] = after_scores
        after_analysis["stats"] = after_stats
        after_analysis["issues"] = verified_remaining_issues

        # JSON response structures
        before_analysis_res = {
            "errors": [iss for iss in original_issues if iss["severity"] == "error"],
            "warnings": [iss for iss in original_issues if iss["severity"] == "warning"],
            "qualityScore": original_score
        }

        after_analysis_res = {
            "errors": [iss for iss in verified_remaining_issues if iss["severity"] == "error"],
            "warnings": [iss for iss in verified_remaining_issues if iss["severity"] == "warning"],
            "qualityScore": after_scores.get("overall", 100)
        }

        # Extra metadata for legacy frontend compatibility
        hierarchy = extract_hierarchy(corrected_code)
        coverage = estimate_coverage(corrected_code)
        metrics = compute_rtl_metrics(corrected_code)
        bug_stats = compute_bug_statistics(verified_remaining_issues)
        explanations = [explain_bug(issue) for issue in verified_remaining_issues]

        rules_catalog = []
        for rule in rules_list:
            rules_catalog.append({
                "ruleId": rule.rule_id,
                "name": rule.name,
                "category": rule.category,
                "severity": rule.severity,
                "description": rule.description,
                "why": rule.why_dangerous,
                "fix": rule.recommended_fix,
                "confidence": getattr(rule, 'confidence', 90)
            })

        # Summary of auto fixes for backward-compatible statistics
        auto_fix_summary = {
            "Total Auto Fixes": len(resolved_fixes),
            "Resolved Warnings": len([f for f in resolved_fixes if f["rule"] in [w["ruleId"] for w in before_analysis_res["warnings"]]]),
            "Resolved Errors": len([f for f in resolved_fixes if f["rule"] in [e["ruleId"] for e in before_analysis_res["errors"]]])
        }

        return ok({
            # The requested clean payload structure
            "originalRTL": code,
            "correctedRTL": corrected_code,
            "beforeAnalysis": before_analysis_res,
            "afterAnalysis": after_analysis_res,
            "fixLog": resolved_fixes,

            # Legacy compatibility fields
            "originalCode": code,
            "correctedCode": corrected_code,
            "analysis": after_analysis,
            "autoFixSummary": auto_fix_summary,
            "hierarchy": hierarchy,
            "coverage": coverage,
            "metrics": metrics,
            "bugStats": bug_stats,
            "explanations": explanations,
            "rulesCatalog": rules_catalog
        })
    except Exception as e:
        import traceback
        traceback.print_exc()
        return err(f"Analysis failed: {str(e)}", 500)


# ════════════════════════════════════════════════
# COVERAGE ENDPOINT
# ════════════════════════════════════════════════
@app.route("/api/coverage", methods=["POST"])
def coverage_endpoint():
    b = request.get_json(silent=True) or {}
    code = b.get("code") or b.get("content") or ""
    if not code.strip():
        return err("RTL code is required")
    try:
        cov = estimate_coverage(code)
        return ok(cov)
    except Exception as e:
        return err(f"Coverage analysis failed: {str(e)}", 500)

# ════════════════════════════════════════════════
# AI CHAT ENDPOINT
# ════════════════════════════════════════════════
@app.route("/api/chat", methods=["POST"])
def ai_chat():
    b = request.get_json(silent=True) or {}
    message   = (b.get("message") or "").strip()
    rtl_ctx   = b.get("rtlContext") or ""
    issues_ctx = b.get("issuesContext") or []
    user_id   = b.get("userId") or ""

    if not message:
        return err("Message is required")

    try:
        # Try Gemini API if key available
        if GEMINI_KEY:
            try:
                import google.generativeai as genai
                genai.configure(api_key=GEMINI_KEY)
                model = genai.GenerativeModel('gemini-pro')
                prompt = f"""You are RTLGuard AI, an expert Verilog/SystemVerilog RTL design and verification assistant.

Current RTL Context (if any):
```verilog
{rtl_ctx[:2000] if rtl_ctx else 'No file loaded'}
```

Detected Issues: {json.dumps(issues_ctx[:3], indent=2) if issues_ctx else 'None'}

User Question: {message}

Provide a detailed, helpful answer with Verilog code examples where applicable. Use markdown formatting."""
                response = model.generate_content(prompt)
                answer = response.text
            except Exception:
                answer = chat_with_rtl_ai(message, rtl_ctx, issues_ctx)
        else:
            answer = chat_with_rtl_ai(message, rtl_ctx, issues_ctx)

        # Persist chat to MongoDB if user logged in
        if user_id and db is not None:
            chats_col().insert_one({
                "user_id": user_id,
                "message": message,
                "response": answer,
                "timestamp": now()
            })

        return ok({"answer": answer, "model": "gemini" if GEMINI_KEY else "rtlguard-knowledge-base"})
    except Exception as e:
        return err(f"Chat failed: {str(e)}", 500)

# ════════════════════════════════════════════════
# ZIP PROJECT UPLOAD
# ════════════════════════════════════════════════
@app.route("/api/upload-zip", methods=["POST"])
def upload_zip():
    """Accept a ZIP file containing multiple Verilog files, analyze all."""
    if "file" not in request.files:
        return err("No file uploaded")

    f = request.files["file"]
    if not f.filename.endswith(".zip"):
        return err("Only .zip files accepted")

    user_id_str = request.form.get("userId", "")
    uid = to_oid(user_id_str)

    try:
        data = f.read()
        results = []
        with zipfile.ZipFile(io.BytesIO(data)) as z:
            for name in z.namelist():
                if name.endswith(('.v', '.sv', '.vh')) and not name.startswith('__'):
                    content = z.read(name).decode('utf-8', errors='replace')
                    corrected_code, fix_log, auto_fix_summary = auto_repair_rtl(content)
                    analysis = analyze_rtl(corrected_code)
                    file_result = {
                        "name": name,
                        "content": corrected_code,
                        "original_content": content,
                        "fix_log": fix_log,
                        "auto_fix_summary": auto_fix_summary,
                        "analysis": analysis,
                        "linesOfCode": len(corrected_code.split('\n'))
                    }
                    results.append(file_result)

                    # Save each file to DB
                    if uid and db is not None:
                        ts = now()
                        short_name = name.split('/')[-1]
                        doc_res = files_col().insert_one({
                            "user_id": uid, 
                            "name": short_name, 
                            "content": corrected_code,
                            "original_content": content,
                            "fix_log": fix_log,
                            "auto_fix_summary": auto_fix_summary,
                            "analysis_result": analysis, 
                            "created_at": ts, 
                            "updated_at": ts
                        })
                        log_run(doc_res.inserted_id, uid, analysis, ts)

        if not results:
            return err("No Verilog/SystemVerilog files found in ZIP")

        summary = {
            "totalFiles": len(results),
            "totalErrors": sum(r["analysis"]["stats"]["errors"] for r in results),
            "totalWarnings": sum(r["analysis"]["stats"]["warnings"] for r in results),
            "avgScore": round(sum(r["analysis"]["scores"]["overall"] for r in results) / len(results))
        }

        return ok({"files": results, "summary": summary})
    except Exception as e:
        return err(f"ZIP processing failed: {str(e)}", 500)

# ════════════════════════════════════════════════
# VISUALIZATION / HIERARCHY
# ════════════════════════════════════════════════
@app.route("/api/hierarchy", methods=["POST"])
def hierarchy_endpoint():
    b = request.get_json(silent=True) or {}
    code = b.get("code") or ""
    if not code.strip():
        return err("RTL code is required")
    try:
        h = extract_hierarchy(code)
        return ok(h)
    except Exception as e:
        return err(f"Hierarchy extraction failed: {str(e)}", 500)

# ════════════════════════════════════════════════
# DASHBOARD
# ════════════════════════════════════════════════
@app.route("/api/dashboard", methods=["GET"])
def dashboard():
    if db is None: return err("DB unavailable", 503)
    uid = to_oid(request.args.get("userId"))
    if not uid: return err("Invalid userId")

    fs = list(files_col().find({"user_id": uid}))
    n  = len(fs)

    if n == 0:
        return ok({
            "totalModules": 0, "avgQuality": 100, "avgSecurity": 100,
            "avgPerformance": 100, "avgOverall": 100, "totalIssues": 0,
            "totalErrors": 0, "totalWarnings": 0, "totalSuggestions": 0,
            "avgCoverage": 0, "recentRuns": [], "recentFiles": []
        })

    def avg(key):
        vals = [f["analysis_result"]["scores"].get(key, 0) for f in fs]
        return round(sum(vals) / n)

    total_errors   = sum(f["analysis_result"].get("stats", {}).get("errors", 0) for f in fs)
    total_warnings = sum(f["analysis_result"].get("stats", {}).get("warnings", 0) for f in fs)
    total_issues   = sum(len(f["analysis_result"]["issues"]) for f in fs)
    total_sugg     = sum(len(f["analysis_result"].get("suggestions", [])) for f in fs)

    recent = list(runs_col().find({"user_id": uid}, sort=[("run_at", DESCENDING)], limit=20))
    recent_files = list(files_col().find({"user_id": uid}, sort=[("updated_at", DESCENDING)], limit=8))

    return ok({
        "totalModules":    n,
        "avgQuality":      avg("quality"),
        "avgSecurity":     avg("security"),
        "avgPerformance":  avg("performance"),
        "avgOverall":      avg("overall"),
        "avgSynthesizability": avg("synthesizability"),
        "avgReadability":  avg("readability"),
        "totalIssues":     total_issues,
        "totalErrors":     total_errors,
        "totalWarnings":   total_warnings,
        "totalSuggestions": total_sugg,
        "avgCoverage":     75,  # placeholder until real coverage runs
        "recentRuns":      [serial(r) for r in recent],
        "recentFiles":     [{"name": f["name"], "id": str(f["_id"]),
                             "score": f["analysis_result"]["scores"].get("overall", 0),
                             "issues": len(f["analysis_result"]["issues"]),
                             "updated": str(f.get("updated_at", ""))} for f in recent_files]
    })

# ════════════════════════════════════════════════
# AI TESTBENCH GENERATOR
# ════════════════════════════════════════════════
@app.route("/generate-testbench", methods=["POST"])
@app.route("/api/generate-testbench", methods=["POST"])
def generate_tb_endpoint():
    b = request.get_json(silent=True) or {}
    rtl_code = b.get("rtl_code") or ""
    if not rtl_code.strip():
        return err("RTL code is required")

    try:
        parsed     = parse_verilog(rtl_code)
        tb_code    = generate_testbench(parsed)
        assertions = generate_assertions(parsed)
        coverage   = generate_coverage(parsed)
        waveform   = predict_waveform(parsed)
        doc        = generate_documentation(parsed)
        scores     = compute_scores(parsed)

        return ok({
            "summary":      parsed,
            "testbench":    tb_code,
            "assertions":   assertions,
            "coverage":     coverage,
            "waveform":     waveform,
            "documentation": doc,
            "scores":       scores
        })
    except Exception as e:
        return err(f"Testbench generation failed: {str(e)}", 500)

# ════════════════════════════════════════════════
# EXPORT ENDPOINTS
# ════════════════════════════════════════════════
@app.route("/api/export/json/<fid>", methods=["GET"])
def export_json(fid):
    if db is None: return err("DB unavailable", 503)
    foid = to_oid(fid)
    if not foid: return err("Invalid file ID")
    doc = files_col().find_one({"_id": foid})
    if not doc: return err("File not found", 404)
    payload = {
        "name": doc["name"],
        "content": doc["content"],
        "analysis": doc["analysis_result"],
        "exportedAt": datetime.now().isoformat()
    }
    return Response(
        json.dumps(payload, indent=2, default=str),
        mimetype="application/json",
        headers={"Content-Disposition": f"attachment; filename={doc['name']}_analysis.json"}
    )


@app.route("/api/export/csv/<fid>", methods=["GET"])
def export_csv(fid):
    if db is None: return err("DB unavailable", 503)
    foid = to_oid(fid)
    if not foid: return err("Invalid file ID")
    doc = files_col().find_one({"_id": foid})
    if not doc: return err("File not found", 404)

    issues = doc["analysis_result"].get("issues", [])
    scores = doc["analysis_result"].get("scores", {})

    lines = ["ID,Severity,Line,Message,Recommendation"]
    for issue in issues:
        msg = issue["message"].replace(",", ";")
        rec = issue["recommendation"].replace(",", ";")
        lines.append(f"{issue['id']},{issue['severity']},{issue['lineNum']},{msg},{rec}")

    lines.append("")
    lines.append("Metric,Score")
    for k, v in scores.items():
        lines.append(f"{k},{v}")

    return Response(
        "\n".join(lines),
        mimetype="text/csv",
        headers={"Content-Disposition": f"attachment; filename={doc['name']}_report.csv"}
    )


@app.route("/api/export/html/<fid>", methods=["GET"])
def export_html(fid):
    if db is None: return err("DB unavailable", 503)
    foid = to_oid(fid)
    if not foid: return err("Invalid file ID")
    doc = files_col().find_one({"_id": foid})
    if not doc: return err("File not found", 404)

    issues = doc["analysis_result"].get("issues", [])
    scores = doc["analysis_result"].get("scores", {})

    severity_colors = {"error": "#ef4444", "warning": "#f59e0b", "info": "#3b82f6"}

    issues_html = ""
    for iss in issues:
        color = severity_colors.get(iss["severity"], "#6b7280")
        issues_html += f"""
        <tr>
            <td style="color:{color};font-weight:bold;text-transform:uppercase">{iss['severity']}</td>
            <td>{iss['lineNum']}</td>
            <td><code>{iss['codeSnippet']}</code></td>
            <td>{iss['message']}</td>
            <td>{iss['recommendation']}</td>
        </tr>"""

    scores_html = "".join(
        f'<div class="score-item"><span>{k}</span><strong>{v}</strong></div>'
        for k, v in scores.items()
    )

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>RTLGuard AI Report — {doc['name']}</title>
<style>
  body {{ font-family: 'Segoe UI', sans-serif; background: #030712; color: #e5e7eb; margin: 0; padding: 2rem; }}
  h1 {{ color: #00f2fe; border-bottom: 2px solid #00f2fe40; padding-bottom: 0.5rem; }}
  h2 {{ color: #4facfe; margin-top: 2rem; }}
  table {{ width: 100%; border-collapse: collapse; margin-top: 1rem; }}
  th {{ background: #0b101e; color: #9ca3af; text-align: left; padding: 10px 12px; font-size: 11px; text-transform: uppercase; }}
  td {{ padding: 10px 12px; border-bottom: 1px solid #ffffff10; font-size: 13px; vertical-align: top; }}
  tr:hover td {{ background: #ffffff05; }}
  code {{ background: #0b101e; padding: 2px 6px; border-radius: 4px; font-family: 'Courier New', monospace; color: #00f2fe; }}
  .score-item {{ display: flex; justify-content: space-between; padding: 8px 12px; background: #0b101e; border-radius: 8px; margin-bottom: 6px; }}
  .score-item strong {{ color: #00f2fe; }}
  .header {{ display: flex; justify-content: space-between; align-items: flex-start; }}
  .meta {{ color: #6b7280; font-size: 12px; }}
</style>
</head>
<body>
<div class="header">
  <div>
    <h1>⚡ RTLGuard AI — Analysis Report</h1>
    <div class="meta">File: {doc['name']} | Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</div>
  </div>
</div>

<h2>RTL Quality Scores</h2>
<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:8px;margin-top:12px">
{scores_html}
</div>

<h2>Detected Issues ({len(issues)} total)</h2>
<table>
  <thead>
    <tr>
      <th>Severity</th><th>Line</th><th>Code Snippet</th><th>Issue</th><th>Recommendation</th>
    </tr>
  </thead>
  <tbody>
    {issues_html if issues_html else '<tr><td colspan="5" style="text-align:center;color:#22c55e">✅ No issues detected!</td></tr>'}
  </tbody>
</table>

<p class="meta" style="margin-top:2rem">RTLGuard AI v2.0 — Professional RTL Verification Platform</p>
</body>
</html>"""

    return Response(
        html,
        mimetype="text/html",
        headers={"Content-Disposition": f"attachment; filename={doc['name']}_report.html"}
    )

# ════════════════════════════════════════════════
# CHAT HISTORY
# ════════════════════════════════════════════════
@app.route("/api/chat/history", methods=["GET"])
def chat_history():
    if db is None: return err("DB unavailable", 503)
    uid = to_oid(request.args.get("userId"))
    if not uid: return err("Invalid userId")
    chats = list(chats_col().find({"user_id": uid}, sort=[("timestamp", DESCENDING)], limit=50))
    return ok([serial(c) for c in chats])

# ════════════════════════════════════════════════
# SERVE FRONTEND
# ════════════════════════════════════════════════
STATIC = os.path.join(os.path.dirname(__file__), "..")

# Explicit MIME types for ES modules - critical for browser to execute JS
MIME_TYPES = {
    ".js":   "application/javascript",
    ".mjs":  "application/javascript",
    ".css":  "text/css",
    ".html": "text/html",
    ".json": "application/json",
    ".svg":  "image/svg+xml",
    ".png":  "image/png",
    ".ico":  "image/x-icon",
    ".woff": "font/woff",
    ".woff2": "font/woff2",
}

@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def static_files(path):
    from flask import make_response
    import mimetypes
    fp = os.path.join(STATIC, path)
    if path and os.path.exists(fp) and os.path.isfile(fp):
        ext = os.path.splitext(path)[1].lower()
        mime = MIME_TYPES.get(ext, mimetypes.guess_type(path)[0] or "application/octet-stream")
        with open(fp, "rb") as f:
            data = f.read()
        resp = make_response(data)
        resp.headers["Content-Type"] = mime
        resp.headers["Cache-Control"] = "no-cache"
        return resp
    # fallback: serve index.html for SPA routing
    return send_from_directory(STATIC, "index.html")

# ════════════════════════════════════════════════
# ENTRY POINT
# ════════════════════════════════════════════════
if __name__ == "__main__":
    print("=" * 50)
    print("  RTLGuard AI ⚡ Enhanced v2.0")
    print(f"  http://localhost:{PORT}")
    print("=" * 50)
    app.run(host="0.0.0.0", port=PORT, debug=True)
