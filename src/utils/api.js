/**
 * RTLGuard AI — Enhanced Frontend API Client v2.0
 */

const API_BASE = '/api';

async function request(method, path, body = null) {
    const options = { method, headers: { 'Content-Type': 'application/json' } };
    if (body) options.body = JSON.stringify(body);
    const res  = await fetch(`${API_BASE}${path}`, options);
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.error || `Request failed with status ${res.status}`);
    return json.data;
}

// ─────────────────── AUTH ───────────────────────
export async function apiRegister(name, email, password, role = 'RTL Design Engineer') {
    return request('POST', '/auth/register', { name, email, password, role });
}
export async function apiLogin(email, password) {
    return request('POST', '/auth/login', { email, password });
}
export async function apiUpdateProfile(userId, updates) {
    return request('PUT', '/auth/profile', { userId, ...updates });
}

// ─────────────────── FILES ──────────────────────
export async function apiGetFiles(userId)                  { return request('GET', `/files?userId=${userId}`); }
export async function apiCreateFile(userId, name, content) { return request('POST', '/files', { userId, name, content }); }
export async function apiUpdateFile(fileId, updates)       { return request('PUT', `/files/${fileId}`, updates); }
export async function apiDeleteFile(fileId)                { return request('DELETE', `/files/${fileId}`); }
export async function apiGetFileHistory(fileId)            { return request('GET', `/files/${fileId}/history`); }

// ─────────────────── DASHBOARD ──────────────────
export async function apiGetDashboard(userId) { return request('GET', `/dashboard?userId=${userId}`); }

// ─────────────────── HEALTH ─────────────────────
export async function apiHealthCheck() {
    try {
        const res  = await fetch(`${API_BASE}/health`);
        const json = await res.json();
        return json.success && json.data?.db === 'connected';
    } catch { return false; }
}

// ─────────────────── TESTBENCH ──────────────────
export async function apiGenerateTestbench(rtlCode) {
    return request('POST', '/generate-testbench', { rtl_code: rtlCode });
}

// ─────────────────── ENHANCED ANALYSIS ─────────
/** Full enhanced analysis with auto-fix, hierarchy, coverage */
export async function apiEnhancedAnalysis(code, geminiKey = '') {
    return request('POST', '/analyze', { code, geminiKey });
}

// ─────────────────── COVERAGE ───────────────────
export async function apiGetCoverage(code) {
    return request('POST', '/coverage', { code });
}

// ─────────────────── AI CHAT ────────────────────
export async function apiChat(message, rtlContext = '', issuesContext = [], userId = '') {
    return request('POST', '/chat', { message, rtlContext, issuesContext, userId });
}
export async function apiGetChatHistory(userId) {
    return request('GET', `/chat/history?userId=${userId}`);
}

// ─────────────────── VISUALIZATION ─────────────
export async function apiGetHierarchy(code) {
    return request('POST', '/hierarchy', { code });
}

// ─────────────────── RULES CATALOG ──────────────
export async function apiGetRules(params = {}) {
    const qs = new URLSearchParams();
    if (params.category) qs.set('category', params.category);
    if (params.severity) qs.set('severity', params.severity);
    if (params.q)        qs.set('q',        params.q);
    return request('GET', `/rules${qs.toString() ? '?' + qs.toString() : ''}`);
}

// ─────────────────── PLATFORM STATS ─────────────
export async function apiGetPlatformStats() {
    return request('GET', '/stats');
}

// ─────────────────── ZIP UPLOAD ─────────────────
export async function apiUploadZip(file, userId) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('userId', userId || '');
    const res  = await fetch(`${API_BASE}/upload-zip`, { method: 'POST', body: formData });
    const json = await res.json();
    if (!res.ok || !json.success) throw new Error(json.error || 'ZIP upload failed');
    return json.data;
}

// ─────────────────── EXPORT ─────────────────────
export function apiExportHTML(fileId) {
    window.open(`${API_BASE}/export/html/${fileId}`, '_blank');
}
export function apiExportJSON(fileId) {
    window.open(`${API_BASE}/export/json/${fileId}`, '_blank');
}
export function apiExportCSV(fileId) {
    window.open(`${API_BASE}/export/csv/${fileId}`, '_blank');
}

/** Export analysis as PDF using jsPDF (client-side) */
export function apiExportPDF(fileName, scores, issues, autoFixSummary) {
    try {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ orientation: 'portrait', format: 'a4' });

        doc.setFillColor(3, 7, 18);
        doc.rect(0, 0, 210, 297, 'F');
        doc.setTextColor(0, 242, 254);
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text('RTLGuard AI — Analysis Report', 14, 22);

        doc.setTextColor(156, 163, 175);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`File: ${fileName}`, 14, 32);
        doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 38);

        // Scores
        doc.setTextColor(79, 172, 254);
        doc.setFontSize(13);
        doc.setFont('helvetica', 'bold');
        doc.text('Quality Scores', 14, 52);

        let y = 60;
        doc.setFontSize(10);
        Object.entries(scores || {}).forEach(([k, v]) => {
            doc.setTextColor(156, 163, 175);
            doc.setFont('helvetica', 'normal');
            doc.text(k, 14, y);
            doc.setTextColor(0, 242, 254);
            doc.setFont('helvetica', 'bold');
            doc.text(String(v), 80, y);
            y += 7;
        });

        // Auto-Fix Summary Section
        if (autoFixSummary && Object.keys(autoFixSummary).length > 0) {
            y += 5;
            doc.setTextColor(0, 242, 254);
            doc.setFontSize(13);
            doc.setFont('helvetica', 'bold');
            doc.text('RTL Auto-Correct Summary', 14, y);
            y += 8;
            doc.setFontSize(9);
            Object.entries(autoFixSummary)
                .filter(([k, v]) => v > 0 && k !== "Standardized Formatting Applied")
                .forEach(([k, v]) => {
                    if (y > 270) { doc.addPage(); y = 20; }
                    doc.setTextColor(156, 163, 175);
                    doc.setFont('helvetica', 'normal');
                    doc.text(k, 14, y);
                    doc.setTextColor(0, 242, 254);
                    doc.setFont('helvetica', 'bold');
                    doc.text(String(v), 120, y);
                    y += 5.5;
                });
            y += 4;
        }

        // Issues
        y += 4;
        doc.setTextColor(79, 172, 254);
        doc.setFontSize(13);
        doc.setFont('helvetica', 'bold');
        doc.text(`Unresolved Issues (${(issues || []).length})`, 14, y);
        y += 10;

        (issues || []).slice(0, 20).forEach(iss => {
            if (y > 270) { doc.addPage(); y = 20; }
            const colors = { error: [239,68,68], warning: [245,158,11], info: [59,130,246] };
            const [r,g,b] = colors[iss.severity] || [107,114,128];
            doc.setTextColor(r, g, b);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(9);
            doc.text(`[${iss.severity.toUpperCase()}] Line ${iss.lineNum}: ${iss.message}`, 14, y);
            y += 5;
            doc.setTextColor(156, 163, 175);
            doc.setFont('helvetica', 'normal');
            const rec = doc.splitTextToSize(iss.recommendation, 180);
            doc.text(rec, 14, y);
            y += rec.length * 4 + 4;
        });

        doc.setTextColor(100, 100, 100);
        doc.setFontSize(8);
        doc.text('RTLGuard AI v3.0 — Intelligent RTL Auto-Correct Platform', 14, 290);

        doc.save(`${fileName}_rtlguard_report.pdf`);
    } catch (e) {
        console.error('PDF export failed:', e);
        alert('PDF export failed. jsPDF library may not be loaded.');
    }
}
