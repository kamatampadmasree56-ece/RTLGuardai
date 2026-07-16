import React, { createContext, useContext, useState, useEffect, useCallback } from 'https://esm.sh/react@18.2.0';
import {
    apiLogin,
    apiRegister,
    apiUpdateProfile,
    apiGetFiles,
    apiCreateFile,
    apiUpdateFile,
    apiDeleteFile,
    apiHealthCheck
} from './api.js';

const AppContext = createContext();

// ─────────────────────────────────────────────────
// Helpers — localStorage session
// ─────────────────────────────────────────────────
const SESSION_KEY = 'rtlguard_user';

function saveSession(user) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
}

function loadSession() {
    try {
        const raw = localStorage.getItem(SESSION_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
}

function clearSession() {
    localStorage.removeItem(SESSION_KEY);
}

// ─────────────────────────────────────────────────
// Convert a MongoDB file document → frontend format
// ─────────────────────────────────────────────────
function toFrontendFile(doc) {
    return {
        id:             doc._id,
        name:           doc.name,
        content:        doc.content,
        originalContent: doc.original_content || doc.content,
        fixLog:         doc.fix_log || [],
        autoFixSummary: doc.auto_fix_summary || {},
        analysisResult: doc.analysis_result,
        timestamp:      doc.updated_at
            ? new Date(doc.updated_at).toLocaleString()
            : new Date().toLocaleString()
    };
}

// ─────────────────────────────────────────────────
// AppStateProvider
// ─────────────────────────────────────────────────
export function AppStateProvider({ children }) {
    // ── Nav
    const [activeView, setActiveView] = useState('landing');
    const debounceTimeoutRef = React.useRef(null);

    useEffect(() => {
        return () => {
            if (debounceTimeoutRef.current) {
                clearTimeout(debounceTimeoutRef.current);
            }
        };
    }, []);

    // ── Auth (restored from localStorage session)
    const [user, setUser]             = useState(() => loadSession());

    // ── Files
    const [files, setFiles]           = useState([]);
    const [activeFileId, setActiveFileId] = useState(null);
    const [sidebarOpen, setSidebarOpen]   = useState(true);

    // ── Theme State
    const [theme, setTheme] = useState(() => localStorage.getItem('rtlguard_theme') || 'dark');

    // ── UI feedback
    const [loading, setLoading]   = useState(false);
    const [apiError, setApiError] = useState(null);
    const [backendOk, setBackendOk] = useState(null); // null = not checked yet

    const toggleTheme = () => {
        const newTheme = theme === 'dark' ? 'light' : 'dark';
        setTheme(newTheme);
        localStorage.setItem('rtlguard_theme', newTheme);
    };

    // ─────────────────────────────────────────────
    // On mount: check backend health and restore files
    // ─────────────────────────────────────────────
    useEffect(() => {
        async function init() {
            const healthy = await apiHealthCheck();
            setBackendOk(healthy);
            if (!healthy) {
                console.warn('⚠️ RTLGuard backend not reachable. Running in offline mode.');
            }
        }
        init();
    }, []);

    // When a user session is active, load their files from MongoDB
    useEffect(() => {
        if (user?.userId && backendOk) {
            loadFilesFromDB(user.userId);
        }
    }, [user?.userId, backendOk]);

    // ─────────────────────────────────────────────
    // Internal: load files from MongoDB
    // ─────────────────────────────────────────────
    const loadFilesFromDB = useCallback(async (userId) => {
        try {
            setLoading(true);
            const docs = await apiGetFiles(userId);
            const mapped = (docs || []).map(toFrontendFile);
            setFiles(mapped);
            if (mapped.length > 0) {
                setActiveFileId(mapped[0].id);
            }
        } catch (err) {
            console.error('Failed to load files:', err);
            setApiError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    // ─────────────────────────────────────────────
    // Navigation
    // ─────────────────────────────────────────────
    const setView = (view) => {
        if (!user && view !== 'landing' && view !== 'about') {
            setActiveView('login');
        } else {
            setActiveView(view);
        }
    };

    // ─────────────────────────────────────────────
    // Auth: Login
    // ─────────────────────────────────────────────
    const login = async (email, password) => {
        setLoading(true);
        setApiError(null);
        try {
            const userData = await apiLogin(email, password);
            setUser(userData);
            saveSession(userData);
            setActiveView('dashboard');
            return { success: true };
        } catch (err) {
            setApiError(err.message);
            return { success: false, error: err.message };
        } finally {
            setLoading(false);
        }
    };

    // ─────────────────────────────────────────────
    // Auth: Register
    // ─────────────────────────────────────────────
    const register = async (name, email, password, role) => {
        setLoading(true);
        setApiError(null);
        try {
            const userData = await apiRegister(name, email, password, role);
            setUser(userData);
            saveSession(userData);
            setActiveView('dashboard');
            return { success: true };
        } catch (err) {
            setApiError(err.message);
            return { success: false, error: err.message };
        } finally {
            setLoading(false);
        }
    };

    // ─────────────────────────────────────────────
    // Auth: Update Profile
    // ─────────────────────────────────────────────
    const updateProfile = async (updates) => {
        if (!user?.userId) return { success: false, error: 'Not logged in' };
        setLoading(true);
        try {
            const updated = await apiUpdateProfile(user.userId, updates);
            const merged = { ...user, ...updated };
            setUser(merged);
            saveSession(merged);
            return { success: true };
        } catch (err) {
            return { success: false, error: err.message };
        } finally {
            setLoading(false);
        }
    };

    // ─────────────────────────────────────────────
    // Auth: Logout
    // ─────────────────────────────────────────────
    const logout = () => {
        clearSession();
        setUser(null);
        setFiles([]);
        setActiveFileId(null);
        setActiveView('landing');
    };

    // ─────────────────────────────────────────────
    // Files: Add
    // ─────────────────────────────────────────────
    const addFile = async (name, content) => {
        setApiError(null);
        if (user?.userId && backendOk) {
            // Persist to MongoDB
            try {
                const doc     = await apiCreateFile(user.userId, name, content);
                const newFile = toFrontendFile(doc);
                setFiles(prev => [newFile, ...prev]);
                setActiveFileId(newFile.id);
                return newFile.id;
            } catch (err) {
                setApiError(err.message);
                console.error('Failed to save file to DB:', err);
            }
        }

        // Offline fallback: use local state only
        const { analyzeRTL } = await import('./rtlParser.js');
        const result = analyzeRTL(content);
        const newFile = {
            id:             `file_${Date.now()}`,
            name,
            content,
            analysisResult: result,
            timestamp:      new Date().toLocaleString()
        };
        setFiles(prev => [newFile, ...prev]);
        setActiveFileId(newFile.id);
        return newFile.id;
    };

    // ─────────────────────────────────────────────
    // Files: Update content (re-analyze)
    // ─────────────────────────────────────────────
    const updateActiveFileContent = async (content) => {
        if (!activeFileId) return;
        setApiError(null);

        // Update local state immediately so editor is responsive and doesn't flicker/jump
        setFiles(prev => prev.map(f => {
            if (f.id !== activeFileId) return f;
            return { ...f, content };
        }));

        if (user?.userId && backendOk) {
            if (debounceTimeoutRef.current) {
                clearTimeout(debounceTimeoutRef.current);
            }
            debounceTimeoutRef.current = setTimeout(async () => {
                try {
                    const doc = await apiUpdateFile(activeFileId, { content });
                    const updated = toFrontendFile(doc);
                    setFiles(prev => prev.map(f => f.id === activeFileId ? updated : f));
                } catch (err) {
                    console.error('Failed to update file in DB:', err);
                    setApiError(err.message);
                }
            }, 1000);
            return;
        }

        // Offline fallback
        const { analyzeRTL } = await import('./rtlParser.js');
        const result = analyzeRTL(content);
        setFiles(prev => prev.map(f => {
            if (f.id !== activeFileId) return f;
            return { ...f, content, analysisResult: result, timestamp: new Date().toLocaleString() };
        }));
    };

    // ─────────────────────────────────────────────
    // Files: Delete
    // ─────────────────────────────────────────────
    const deleteFile = async (id) => {
        setApiError(null);

        if (user?.userId && backendOk) {
            try {
                await apiDeleteFile(id);
            } catch (err) {
                console.error('Failed to delete file from DB:', err);
                setApiError(err.message);
            }
        }

        setFiles(prev => {
            const filtered = prev.filter(f => f.id !== id);
            if (activeFileId === id) {
                setActiveFileId(filtered.length > 0 ? filtered[0].id : null);
            }
            return filtered;
        });
    };

    // ─────────────────────────────────────────────
    // Files: Run analysis (re-scan)
    // ─────────────────────────────────────────────
    const runAnalysis = async (id) => {
        const file = files.find(f => f.id === id);
        if (!file) return;
        setApiError(null);

        if (user?.userId && backendOk) {
            try {
                const doc     = await apiUpdateFile(id, { content: file.content });
                const updated = toFrontendFile(doc);
                setFiles(prev => prev.map(f => f.id === id ? updated : f));
                return;
            } catch (err) {
                console.error('Failed to re-analyze in DB:', err);
            }
        }

        // Offline fallback
        const { analyzeRTL } = await import('./rtlParser.js');
        const result = analyzeRTL(file.content);
        setFiles(prev => prev.map(f =>
            f.id === id ? { ...f, analysisResult: result, timestamp: new Date().toLocaleString() } : f
        ));
    };

    const activeFile = files.find(f => f.id === activeFileId) || null;

    return React.createElement(
        AppContext.Provider,
        {
            value: {
                // Nav
                activeView,
                setView,
                // Auth
                user,
                login,
                register,
                logout,
                updateProfile,
                // Files
                files,
                addFile,
                updateActiveFileContent,
                deleteFile,
                activeFileId,
                setActiveFileId,
                activeFile,
                runAnalysis,
                // Sidebar
                sidebarOpen,
                setSidebarOpen,
                // Theme
                theme,
                toggleTheme,
                // Feedback
                loading,
                apiError,
                setApiError,
                backendOk
            }
        },
        children
    );
}

export function useAppState() {
    const context = useContext(AppContext);
    if (!context) {
        throw new Error('useAppState must be used within AppStateProvider');
    }
    return context;
}
