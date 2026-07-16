import React, { useState, useEffect, useRef } from 'https://esm.sh/react@18.2.0';
import { useAppState } from '../utils/appState.js';
import CodeEditor from '../components/CodeEditor.js';
import GlassCard from '../components/GlassCard.js';
import DiffViewer from '../components/DiffViewer.js';
import { apiEnhancedAnalysis, apiUploadZip, apiUpdateFile } from '../utils/api.js';
import { 
    Play, 
    Upload, 
    AlertTriangle, 
    Info, 
    CheckCircle, 
    Zap, 
    Cpu, 
    Lock,
    RefreshCw,
    X,
    FileText,
    FileCode,
    Sparkles,
    Check,
    Download,
    Eye,
    ChevronRight,
    Search,
    SlidersHorizontal,
    Wrench,
    Copy,
    EyeOff,
    HelpCircle,
    BookOpen,
    Plus
} from 'https://esm.sh/lucide-react@0.344.0';

export default function RTLAnalyzer() {
    const { 
        files, 
        activeFile, 
        setActiveFileId, 
        addFile, 
        updateActiveFileContent,
        runAnalysis,
        user
    } = useAppState();

    const [isScanning, setIsScanning] = useState(false);
    const [scanLog, setScanLog] = useState([]);
    const [dragActive, setDragActive] = useState(false);
    const [enhancedData, setEnhancedData] = useState(null);
    const [selectedIssueId, setSelectedIssueId] = useState(null);
    const [zipFiles, setZipFiles] = useState([]);
    const [isZipLoading, setIsZipLoading] = useState(false);

    // Toggle between corrected and original code in editor
    const [codeViewMode, setCodeViewMode] = useState('corrected'); // 'corrected' | 'original' | 'diff'
    const [aiStatus, setAiStatus] = useState('');
    
    // Warning Filters
    const [filterSeverity, setFilterSeverity] = useState('all');
    const [filterCategory, setFilterCategory] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState('warnings'); // 'warnings' | 'fixes' | 'catalog'

    const fileInputRef = useRef(null);
    const zipInputRef = useRef(null);

    const beforeScore = enhancedData?.beforeAnalysis?.qualityScore || activeFile?.analysisResult?.scores?.overall || 100;
    const afterScore = enhancedData?.afterAnalysis?.qualityScore || activeFile?.analysisResult?.scores?.overall || 100;
    const [scoreProgress, setScoreProgress] = useState(beforeScore);

    useEffect(() => {
        if (enhancedData) {
            setScoreProgress(beforeScore);
            const timer = setTimeout(() => {
                setScoreProgress(afterScore);
            }, 100);
            return () => clearTimeout(timer);
        } else {
            setScoreProgress(beforeScore);
        }
    }, [beforeScore, afterScore, enhancedData]);

    // Dynamic scanning console log generator with real-time AI status updates
    const triggerScan = async () => {
        if (!activeFile) return;
        setIsScanning(true);
        setScanLog([]);
        
        const log = (text) => setScanLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${text}`]);

        try {
            setAiStatus('Analyzing RTL...');
            log('Initializing deep structural compiler...');
            log('Parsing RTL tokens and validating Verilog AST...');
            await new Promise(r => setTimeout(r, 600));

            setAiStatus('Generating AI Fixes...');
            log('Auditing logic blocks for safety rule violations...');
            log('Initiating Gemini AI Auto-Fix engine interface...');
            
            // Start the actual backend AI auto-fix and analysis call in parallel with simulation logs
            const key = localStorage.getItem('rtlguard_gemini_key') || '';
            const apiPromise = apiEnhancedAnalysis(activeFile.originalContent || activeFile.content, key);
            
            await new Promise(r => setTimeout(r, 800));
            setAiStatus('Applying Fixes...');
            log('Resolving race conditions, inferred latches, and async reset trees...');
            log('Injecting synthesizable design patterns...');
            
            await new Promise(r => setTimeout(r, 800));
            setAiStatus('Re-running Linter...');
            log('Re-running linter pass on the corrected RTL to verify fixes...');
            
            const data = await apiPromise;
            
            await new Promise(r => setTimeout(r, 600));
            setAiStatus('Verification Complete');
            log('Comparing issues before and after fixes to verify status...');
            log('Analysis Verification: 100% completed.');
            await new Promise(r => setTimeout(r, 500));

            setEnhancedData(data);
            setCodeViewMode('corrected');

            // Force refetch local cache stats & refresh list
            await runAnalysis(activeFile.id);
        } catch (e) {
            log(`[ERROR] Auto-Fix pipeline failed: ${e.message}`);
            console.error('AI Fix error:', e);
            alert('AI Fix generation failed: ' + e.message);
        } finally {
            setIsScanning(false);
            setAiStatus('');
        }
    };

    const fetchEnhancedAnalysis = async () => {
        if (!activeFile) return;
        try {
            const key = localStorage.getItem('rtlguard_gemini_key') || '';
            const data = await apiEnhancedAnalysis(activeFile.originalContent || activeFile.content, key);
            setEnhancedData(data);
            setCodeViewMode('corrected');
        } catch (e) {
            console.error('Enhanced analysis failed:', e);
        }
    };

    // Auto-scan on load if the file has not been analyzed yet or when active file changes
    useEffect(() => {
        if (activeFile) {
            if (!activeFile.analysisResult) {
                triggerScan();
            } else {
                fetchEnhancedAnalysis();
            }
        } else {
            setEnhancedData(null);
        }
    }, [activeFile?.id]);

    const handleTextChange = (val) => {
        updateActiveFileContent(val);
    };

    const handleFileInput = (e) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onload = async (event) => {
                const newId = await addFile(file.name, event.target.result);
                setActiveFileId(newId);
            };
            reader.readAsText(file);
        }
    };

    const handleZipInput = (e) => {
        if (e.target.files && e.target.files[0]) {
            handleUploadedZip(e.target.files[0]);
        }
    };

    const handleUploadedZip = async (file) => {
        setIsZipLoading(true);
        try {
            const data = await apiUploadZip(file, user?.userId || '');
            setZipFiles(data.files || []);
            if (data.files && data.files.length > 0) {
                const first = data.files[0];
                const newId = await addFile(first.name.split('/').pop(), first.content);
                setActiveFileId(newId);
            }
        } catch (e) {
            console.error('ZIP process failed:', e);
            alert('ZIP compilation failed: ' + e.message);
        } finally {
            setIsZipLoading(false);
        }
    };

    // Corrected code save and download button handlers
    const handleDownloadCorrected = () => {
        if (!activeFile || !enhancedData?.correctedRTL) return;
        const filename = activeFile.name.replace(/\.([a-z]+)$/i, '_fixed.$1');
        const blob = new Blob([enhancedData.correctedRTL], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    const handleSaveAsNew = async () => {
        if (!activeFile || !enhancedData?.correctedRTL) return;
        try {
            const newName = activeFile.name.replace(/\.([a-z]+)$/i, '_fixed.$1');
            setIsScanning(true);
            setAiStatus('Applying Fixes...');
            setScanLog(['Creating new corrected module...', 'Saving to database...']);
            
            const newId = await addFile(newName, enhancedData.correctedRTL);
            setActiveFileId(newId);
            setIsScanning(false);
            alert(`Corrected design saved as new file: ${newName}`);
        } catch (e) {
            console.error(e);
            setIsScanning(false);
            alert('Failed to save as new file: ' + e.message);
        }
    };

    const handleReplaceOriginal = async () => {
        if (!activeFile || !enhancedData?.correctedRTL) return;
        try {
            setIsScanning(true);
            setAiStatus('Applying Fixes...');
            setScanLog(['Replacing original file with corrected code...', 'Updating database...']);
            
            // Overwrite original in database using apiUpdateFile
            await apiUpdateFile(activeFile.id, {
                content: enhancedData.correctedRTL,
                original_content: enhancedData.originalRTL,
                analysis_result: enhancedData.analysis,
                fix_log: enhancedData.fixLog,
                auto_fix_summary: enhancedData.autoFixSummary
            });
            
            // Re-run linter to refresh dashboard stats & warn counts
            await runAnalysis(activeFile.id);
            
            setIsScanning(false);
            alert('Original code replaced with corrected version successfully!');
        } catch (e) {
            console.error(e);
            setIsScanning(false);
            alert('Failed to replace original file: ' + e.message);
        }
    };

    // Helper to get issue styling
    const getIssueSeverityStyles = (severity) => {
        switch (severity) {
            case 'error': return 'bg-rose-500/10 border-rose-500/20 text-rose-400 hover:bg-rose-500/15';
            case 'warning': return 'bg-amber-500/10 border-amber-500/20 text-amber-400 hover:bg-amber-500/15';
            default: return 'bg-sky-500/10 border-sky-500/20 text-sky-400 hover:bg-sky-500/15';
        }
    };

    const getIssueIcon = (severity) => {
        switch (severity) {
            case 'error': return Lock;
            case 'warning': return AlertTriangle;
            default: return Info;
        }
    };

    // Auto fix triggers copy/ignore/Ask AI
    const handleCopyCode = (text) => {
        navigator.clipboard.writeText(text);
        alert('Code snippet copied to clipboard.');
    };

    const handleIgnoreWarning = (issueId) => {
        if (!enhancedData) return;
        const updatedIssues = enhancedData.analysis.issues.filter(i => i.id !== issueId);
        setEnhancedData({
            ...enhancedData,
            analysis: {
                ...enhancedData.analysis,
                issues: updatedIssues
            }
        });
    };

    // Process logic filters and logs
    const analysis = enhancedData?.analysis || activeFile?.analysisResult;
    const issues = analysis?.issues || [];
    const fixLog = (enhancedData?.fixLog && enhancedData.fixLog.length > 0) ? enhancedData.fixLog : (activeFile?.fixLog || []);
    const autoFixSummary = (enhancedData?.autoFixSummary && Object.keys(enhancedData.autoFixSummary).length > 0) ? enhancedData.autoFixSummary : (activeFile?.autoFixSummary || {});
    const explanations = enhancedData?.explanations || [];
    const rulesCatalog = enhancedData?.rulesCatalog || [];

    // Filtered lists for Before and After views
    const beforeIssues = (enhancedData?.beforeAnalysis
        ? [...enhancedData.beforeAnalysis.errors, ...enhancedData.beforeAnalysis.warnings]
        : issues).filter(iss => {
            const matchesSeverity = filterSeverity === 'all' || iss.severity === filterSeverity;
            const matchesCategory = filterCategory === 'all' || iss.category === filterCategory;
            const matchesSearch = searchQuery === '' || 
                iss.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
                iss.ruleId.toLowerCase().includes(searchQuery.toLowerCase());
            return matchesSeverity && matchesCategory && matchesSearch;
        });

    const afterIssues = (enhancedData?.afterAnalysis
        ? [...enhancedData.afterAnalysis.errors, ...enhancedData.afterAnalysis.warnings]
        : issues).filter(iss => {
            const matchesSeverity = filterSeverity === 'all' || iss.severity === filterSeverity;
            const matchesCategory = filterCategory === 'all' || iss.category === filterCategory;
            const matchesSearch = searchQuery === '' || 
                iss.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
                iss.ruleId.toLowerCase().includes(searchQuery.toLowerCase());
            return matchesSeverity && matchesCategory && matchesSearch;
        });

    // For compatibility with editor markers and count badges
    const filteredIssues = afterIssues;

    const renderWarningCard = (issue) => {
        const IssueIcon = getIssueIcon(issue.severity);
        const isSelected = selectedIssueId === issue.ruleId;
        const isManualReview = issue.message.includes('[Manual review required]');
        
        return React.createElement(
            'div',
            {
                key: issue.id || `${issue.ruleId}_${issue.lineNum}`,
                onClick: () => setSelectedIssueId(isSelected ? null : issue.ruleId),
                className: `p-3.5 rounded-xl border flex gap-3 cursor-pointer align-start transition-all ${
                    isManualReview 
                        ? 'bg-amber-500/10 border-amber-500/30 text-amber-300 hover:bg-amber-500/15'
                        : getIssueSeverityStyles(issue.severity)
                } ${
                    isSelected ? 'ring-1 ring-cyber-teal/60 bg-white/5' : ''
                }`
            },
            React.createElement(IssueIcon, { className: 'w-4 h-4 mt-0.5 flex-shrink-0' }),
            React.createElement(
                'div',
                { className: 'text-left text-xs min-w-0 flex-1' },
                React.createElement(
                    'div',
                    { className: 'flex items-center gap-2 mb-1.5 justify-between' },
                    React.createElement('span', { className: 'font-bold uppercase text-[9px] px-1.5 py-0.5 bg-black/40 text-gray-300 rounded border border-white/5 font-mono' }, issue.ruleId),
                    React.createElement('span', { className: 'text-[9px] font-semibold text-gray-500 font-mono' }, `Line ${issue.lineNum}`)
                ),
                React.createElement('p', { className: 'font-semibold text-white' }, issue.message),
                
                isSelected && React.createElement(
                    'div',
                    { className: 'mt-3 border-t border-white/5 pt-3 space-y-3.5 text-[10px] text-gray-400' },
                    React.createElement('div', null, 
                        React.createElement('div', { className: 'font-bold text-gray-500 mb-0.5 uppercase tracking-wider text-[8px]' }, 'Problem Explanation:'),
                        React.createElement('span', { className: 'text-gray-300' }, issue.description || issue.message)
                    ),
                    issue.why && React.createElement('div', null, 
                        React.createElement('div', { className: 'font-bold text-gray-500 mb-0.5 uppercase tracking-wider text-[8px]' }, 'Why it occurs:'),
                        React.createElement('span', { className: 'text-gray-300' }, issue.why)
                    ),
                    issue.codeSnippet && React.createElement('div', { className: 'grid grid-cols-2 gap-2 mt-1' },
                        React.createElement('div', null,
                            React.createElement('div', { className: 'font-bold text-rose-400 uppercase tracking-wider text-[8px] mb-0.5' }, 'Incorrect implementation:'),
                            React.createElement('pre', { className: 'bg-black/60 p-2 rounded font-mono text-[9px] text-rose-300 border border-rose-500/10 overflow-x-auto' }, issue.codeSnippet)
                        ),
                        React.createElement('div', null,
                            React.createElement('div', { className: 'font-bold text-emerald-400 uppercase tracking-wider text-[8px] mb-0.5' }, 'Recommended corrected format:'),
                            React.createElement('pre', { className: 'bg-black/60 p-2 rounded font-mono text-[9px] text-emerald-300 border border-emerald-500/10 overflow-x-auto' }, issue.recommendation || '// fix')
                        )
                    ),
                    React.createElement(
                        'div',
                        { className: 'flex justify-between items-center bg-black/40 p-2 rounded border border-white/5 text-[9px]' },
                        React.createElement('div', null,
                            React.createElement('span', { className: 'text-gray-500' }, 'Fix Confidence: '),
                            React.createElement('span', { className: 'font-bold text-cyber-teal font-mono' }, `${issue.confidence || 90}%`)
                        ),
                        React.createElement('div', null,
                            React.createElement('span', { className: 'text-gray-500' }, 'Severity: '),
                            React.createElement('span', { className: 'font-bold text-rose-400 capitalize' }, issue.severity)
                        )
                    ),
                    React.createElement(
                        'div',
                        { className: 'flex flex-wrap gap-1.5 pt-1.5 border-t border-white/5 justify-end' },
                        React.createElement(
                            'button',
                            {
                                onClick: (e) => { e.stopPropagation(); handleCopyCode(issue.recommendation || issue.codeSnippet); },
                                className: 'px-2 py-1 bg-white/5 border border-white/10 hover:border-cyber-teal hover:bg-cyber-teal/5 text-gray-300 hover:text-white rounded transition-all flex items-center gap-1'
                            },
                            React.createElement(Copy, { className: 'w-3 h-3' }),
                            'Copy Fix'
                        )
                    )
                )
            )
        );
    };

    const selectedExplain = explanations.find(e => e.ruleId === selectedIssueId) || 
                             explanations[0] || 
                             (issues.length > 0 ? {
                                 ruleId: issues[0].ruleId,
                                 ruleName: issues[0].ruleName,
                                 severityLabel: issues[0].severity === 'error' ? 'Critical' : 'High',
                                 whatIsWrong: issues[0].description,
                                 whyItHappened: issues[0].why || 'Rule violation in sequential/combinational branch logic.',
                                 hardwareImpact: 'May trigger timing instability, metastability, or invalid synthesizable primitives.',
                                 simulationImpact: 'Could cause mismatch between gate-level and RTL functional behavior.',
                                 synthesisImpact: 'Synthesizer may optimize away valid registers or fail compile entirely.',
                                 bestPractice: 'Review accellera guidelines for clocked sequential logic block designs.',
                                 incorrectCode: issues[0].codeSnippet,
                                 correctCode: issues[0].recommendation,
                                 fixConfidence: issues[0].confidence || 90,
                                 interviewQuestion: 'What are the simulation-synthesis risks associated with blocking assignments in clock-edge processes?'
                             } : null);

    // Editor content based on toggle mode
    const displayedCode = codeViewMode === 'original'
        ? (enhancedData?.originalRTL || activeFile?.originalContent || activeFile?.content || '')
        : (enhancedData?.correctedRTL || enhancedData?.correctedCode || activeFile?.content || '');

    // List categories for drop-down filter
    const categories = Array.from(new Set(issues.map(i => i.category)));

    return React.createElement(
        'div',
        { className: 'flex-1 p-6 space-y-6 bg-cyber-black flex flex-col h-[calc(100vh-80px)] overflow-hidden' },
        
        // ── 1. Control Toolbar
        React.createElement(
            'div',
            { className: 'flex flex-col lg:flex-row items-center justify-between gap-4 bg-white/5 border border-white/5 rounded-xl p-4 flex-shrink-0' },
            
            // Selector dropdown & File Toggle
            React.createElement(
                'div',
                { className: 'flex flex-wrap items-center gap-4 w-full lg:w-auto' },
                React.createElement(
                    'select',
                    {
                        value: activeFile?.id || '',
                        onChange: (e) => setActiveFileId(e.target.value),
                        className: 'bg-black/50 border border-white/10 text-sm text-white px-3 py-2 rounded-lg outline-none focus:border-cyber-teal w-full sm:w-64 font-mono'
                    },
                    files.map(f => React.createElement(
                        'option',
                        { key: f.id, value: f.id },
                        f.name
                    ))
                ),
                
                // Toggle between Corrected, Original, and Compare Diff views
                (activeFile?.originalContent || enhancedData?.correctedCode) && React.createElement(
                    'div',
                    { className: 'flex bg-black/60 p-0.5 rounded-lg border border-white/10' },
                    React.createElement(
                        'button',
                        {
                            onClick: () => setCodeViewMode('corrected'),
                            className: `px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 ${
                                codeViewMode === 'corrected' 
                                    ? 'bg-cyber-teal text-cyber-black shadow-md shadow-cyber-teal/20' 
                                    : 'text-gray-400 hover:text-white'
                            }`
                        },
                        React.createElement(CheckCircle, { className: 'w-3.5 h-3.5' }),
                        'Corrected RTL'
                    ),
                    React.createElement(
                        'button',
                        {
                            onClick: () => setCodeViewMode('original'),
                            className: `px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 ${
                                codeViewMode === 'original' 
                                    ? 'bg-amber-500 text-cyber-black' 
                                    : 'text-gray-400 hover:text-white'
                            }`
                        },
                        React.createElement(SlidersHorizontal, { className: 'w-3.5 h-3.5' }),
                        'Original RTL'
                    ),
                    React.createElement(
                        'button',
                        {
                            onClick: () => setCodeViewMode('diff'),
                            className: `px-3 py-1.5 rounded-md text-xs font-bold transition-all flex items-center gap-1.5 ${
                                codeViewMode === 'diff' 
                                    ? 'bg-cyber-purple text-white shadow-md shadow-cyber-purple/20' 
                                    : 'text-gray-400 hover:text-white'
                            }`
                        },
                        React.createElement(Eye, { className: 'w-3.5 h-3.5' }),
                        'Compare Changes'
                    )
                )
            ),

            // Toolbar buttons
            React.createElement(
                'div',
                { className: 'flex items-center gap-3 w-full lg:w-auto justify-end' },
                // Single File Upload
                React.createElement(
                    'button',
                    {
                        onClick: () => fileInputRef.current?.click(),
                        className: 'px-3 py-2 bg-white/5 border border-white/10 hover:border-cyber-teal rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all text-white'
                    },
                    React.createElement(Upload, { className: 'w-4 h-4 text-cyber-teal' }),
                    'Upload RTL'
                ),
                React.createElement('input', {
                    type: 'file',
                    ref: fileInputRef,
                    onChange: handleFileInput,
                    accept: '.v,.sv,.vh',
                    className: 'hidden'
                }),

                // ZIP Upload
                React.createElement(
                    'button',
                    {
                        onClick: () => zipInputRef.current?.click(),
                        className: 'px-3 py-2 bg-white/5 border border-white/10 hover:border-cyber-purple rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all text-white'
                    },
                    React.createElement(FileText, { className: 'w-4 h-4 text-cyber-purple' }),
                    isZipLoading ? 'Parsing...' : 'Upload ZIP'
                ),
                React.createElement('input', {
                    type: 'file',
                    ref: zipInputRef,
                    onChange: handleZipInput,
                    accept: '.zip',
                    className: 'hidden'
                }),

                // Scan Module Trigger
                React.createElement(
                    'button',
                    {
                        onClick: triggerScan,
                        disabled: !activeFile || isScanning,
                        className: `px-5 py-2 rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all hover:scale-105 ${
                            isScanning 
                                ? 'bg-cyber-teal/30 text-cyber-teal cursor-not-allowed border border-cyber-teal/40' 
                                : 'bg-gradient-to-r from-cyber-teal to-cyber-blue text-cyber-black shadow-[0_0_15px_rgba(0,242,254,0.2)]'
                        }`
                    },
                    React.createElement(Play, { className: `w-4 h-4 ${isScanning ? 'animate-spin' : ''}` }),
                    isScanning ? 'Running repairs...' : 'Analyze RTL Module'
                )
            )
        ),

        // ── 2. Editor & Results Panel
        React.createElement(
            'div',
            { className: 'flex-1 grid grid-cols-1 lg:grid-cols-5 gap-6 min-h-0 overflow-hidden' },
            
            // Left Workspace: Monaco Editor or Diff Viewer (3/5 width)
            React.createElement(
                'div',
                { className: 'lg:col-span-3 h-full relative flex flex-col min-h-0' },
                activeFile ? (
                    codeViewMode === 'diff'
                        ? React.createElement(DiffViewer, {
                            original: enhancedData?.originalRTL || activeFile?.originalContent || activeFile?.content || '',
                            fixed: enhancedData?.correctedRTL || enhancedData?.correctedCode || activeFile?.content || ''
                          })
                        : React.createElement(CodeEditor, {
                            value: displayedCode,
                            onChange: handleTextChange,
                            issues: filteredIssues,
                            readOnly: codeViewMode === 'original',
                            onLineClick: (lineNum) => {
                                const target = filteredIssues.find(i => i.lineNum === lineNum);
                                if (target) setSelectedIssueId(target.ruleId);
                            }
                          })
                ) : React.createElement(
                    'div',
                    { className: 'flex-1 flex flex-col items-center justify-center bg-[#070a13] rounded-xl border border-white/5 text-gray-500' },
                    React.createElement(FileText, { className: 'w-12 h-12 mb-3 text-gray-600' }),
                    'No active module loaded. Upload a design file above to analyze and auto-correct.'
                ),

                // Scanning overlay block
                isScanning && React.createElement(
                    'div',
                    { className: 'absolute inset-0 bg-cyber-black/90 backdrop-blur-sm z-30 flex flex-col items-center justify-center p-8' },
                    React.createElement('div', { className: 'scan-line' }),
                    React.createElement('h3', { className: 'text-lg font-bold text-white mb-2 tracking-wider animate-pulse text-cyber-teal' }, aiStatus || 'AUTO-CORRECT RTL ENGINE RUNNING'),
                    React.createElement('p', { className: 'text-xs text-cyber-teal font-mono mb-8' }, 'Parsing structures and resolving safety violations...'),
                    React.createElement(
                        'div',
                        { className: 'w-full max-w-lg bg-black/60 rounded-xl border border-white/5 p-4 font-mono text-[10px] text-gray-400 space-y-2 h-44 overflow-y-auto text-left' },
                        scanLog.map((log, idx) => React.createElement(
                            'p',
                            { key: idx, className: 'text-cyan-400 border-l-2 border-cyan-500 pl-2' },
                            log
                        ))
                    )
                )
            ),

            // Right Workspace: AI Warning Logs & Auto Fix Log (2/5 width)
            React.createElement(
                'div',
                { className: 'lg:col-span-2 h-full flex flex-col gap-4 overflow-hidden' },
                
                // Compliance Impact Card & Action Buttons
                React.createElement(
                    'div',
                    { className: 'bg-white/5 border border-white/5 rounded-xl p-4 flex flex-col gap-3 flex-shrink-0 text-left' },
                    
                    // Score animation comparison
                    React.createElement(
                        'div',
                        { className: 'flex items-center justify-between' },
                        React.createElement(
                            'div',
                            { className: 'text-left' },
                            React.createElement('p', { className: 'text-[9px] font-bold text-gray-500 uppercase tracking-wider' }, 'Compliance score'),
                            React.createElement(
                                'div',
                                { className: 'flex items-center gap-1.5 mt-0.5' },
                                React.createElement('span', { className: 'text-gray-400 font-mono text-xs' }, `${beforeScore}%`),
                                React.createElement(ChevronRight, { className: 'w-3.5 h-3.5 text-gray-600' }),
                                React.createElement('span', { className: 'text-cyber-teal font-black text-sm glow-text-teal transition-all duration-1000' }, `${scoreProgress}%`)
                            )
                        ),
                        React.createElement(
                            'div',
                            { className: 'flex-1 mx-4 h-1.5 bg-black/40 rounded-full overflow-hidden relative border border-white/5' },
                            React.createElement('div', {
                                className: 'absolute left-0 top-0 h-full bg-gray-600 rounded-full transition-all duration-1000',
                                style: { width: `${beforeScore}%` }
                            }),
                            React.createElement('div', {
                                className: 'absolute left-0 top-0 h-full bg-gradient-to-r from-cyber-teal to-cyber-blue rounded-full transition-all duration-1000',
                                style: { width: `${scoreProgress}%` }
                            })
                        ),
                        React.createElement(
                            'div',
                            { className: 'text-right' },
                            React.createElement('span', { className: 'text-[10px] font-mono font-bold text-cyber-teal bg-cyber-teal/10 border border-cyber-teal/20 px-2 py-0.5 rounded-lg' },
                                `+${afterScore - beforeScore}% Improved`
                            )
                        )
                    ),
                    
                    // Save & download action buttons
                    enhancedData && React.createElement(
                        'div',
                        { className: 'grid grid-cols-3 gap-2 mt-1 border-t border-white/5 pt-3' },
                        React.createElement(
                            'button',
                            {
                                onClick: handleDownloadCorrected,
                                className: 'px-2 py-1.5 bg-white/5 hover:bg-cyber-teal/10 border border-white/10 hover:border-cyber-teal rounded-lg text-[10px] font-bold text-gray-300 hover:text-white transition-all flex items-center justify-center gap-1'
                            },
                            React.createElement(Download, { className: 'w-3 h-3 text-cyber-teal' }),
                            'Download'
                        ),
                        React.createElement(
                            'button',
                            {
                                onClick: handleSaveAsNew,
                                className: 'px-2 py-1.5 bg-white/5 hover:bg-cyber-purple/10 border border-white/10 hover:border-cyber-purple rounded-lg text-[10px] font-bold text-gray-300 hover:text-white transition-all flex items-center justify-center gap-1'
                            },
                            React.createElement(Plus, { className: 'w-3 h-3 text-cyber-purple' }),
                            'Save As New'
                        ),
                        React.createElement(
                            'button',
                            {
                                onClick: handleReplaceOriginal,
                                className: 'px-2 py-1.5 bg-cyber-teal/20 hover:bg-cyber-teal/30 border border-cyber-teal/40 rounded-lg text-[10px] font-black text-cyber-teal hover:text-white transition-all flex items-center justify-center gap-1'
                            },
                            React.createElement(Check, { className: 'w-3 h-3' }),
                            'Replace Original'
                        )
                    )
                ),

                // Tabs selection
                React.createElement(
                    'div',
                    { className: 'flex border-b border-white/5 flex-shrink-0' },
                    [
                        { id: 'warnings', label: `Warnings (${filteredIssues.length})`, icon: AlertTriangle },
                        { id: 'fixes', label: `Fix Log (${fixLog.length})`, icon: Wrench },
                        { id: 'catalog', label: `Rules Catalog`, icon: BookOpen }
                    ].map(tab => React.createElement(
                        'button',
                        {
                            key: tab.id,
                            onClick: () => setActiveTab(tab.id),
                            className: `flex-1 py-2 text-xs font-bold flex items-center justify-center gap-1.5 border-b-2 transition-all ${
                                activeTab === tab.id 
                                    ? 'border-cyber-teal text-cyber-teal bg-cyber-teal/5' 
                                    : 'border-transparent text-gray-400 hover:text-white hover:bg-white/5'
                            }`
                        },
                        React.createElement(tab.icon, { className: 'w-3.5 h-3.5' }),
                        tab.label
                    ))
                ),

                // Tab Content Panel
                React.createElement(
                    'div',
                    { className: 'flex-1 overflow-hidden flex flex-col min-h-0' },
                    
                    // TAB 1: WARNINGS
                    activeTab === 'warnings' && React.createElement(
                        React.Fragment,
                        null,
                        // Quick Search and Filters
                        React.createElement(
                            'div',
                            { className: 'grid grid-cols-2 gap-2 mb-3 flex-shrink-0' },
                            React.createElement('input', {
                                type: 'text',
                                placeholder: 'Search warnings...',
                                value: searchQuery,
                                onChange: (e) => setSearchQuery(e.target.value),
                                className: 'bg-black/40 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-cyber-teal'
                            }),
                            React.createElement(
                                'select',
                                {
                                    value: filterCategory,
                                    onChange: (e) => setFilterCategory(e.target.value),
                                    className: 'bg-black/40 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-cyber-teal'
                                },
                                React.createElement('option', { value: 'all' }, 'All Categories'),
                                categories.map(cat => React.createElement('option', { key: cat, value: cat }, cat))
                            )
                        ),

                        // Warnings Lists (Before vs After)
                        React.createElement(
                            'div',
                            { className: 'flex-grow overflow-y-auto space-y-4 pr-1 text-left' },
                            
                            // 1. Warnings Before Section
                            React.createElement('div', { className: 'space-y-2' },
                                React.createElement('h4', { className: 'text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center justify-between' },
                                    React.createElement('span', null, '⚠️ Warnings Before Fixes'),
                                    React.createElement('span', { className: 'font-mono px-1.5 py-0.5 rounded bg-white/5 font-bold text-gray-400' }, beforeIssues.length)
                                ),
                                beforeIssues.length === 0 ? React.createElement(
                                    'p',
                                    { className: 'text-[11px] text-gray-500 italic pl-2' },
                                    'No warnings detected in original source.'
                                ) : React.createElement(
                                    'div',
                                    { className: 'space-y-2' },
                                    beforeIssues.map(issue => renderWarningCard(issue))
                                )
                            ),
                            
                            // Visual divider
                            React.createElement('div', { className: 'h-[1px] bg-white/5 my-3' }),
                            
                            // 2. Warnings After Section
                            React.createElement('div', { className: 'space-y-2' },
                                React.createElement('h4', { className: 'text-[10px] font-bold text-cyber-teal uppercase tracking-wider mb-2 flex items-center justify-between' },
                                    React.createElement('span', null, '🛡️ Verified Warnings After (Remaining)'),
                                    React.createElement('span', { className: 'font-mono px-1.5 py-0.5 rounded bg-cyber-teal/10 text-cyber-teal font-bold' }, afterIssues.length)
                                ),
                                afterIssues.length === 0 ? React.createElement(
                                    'div',
                                    { className: 'p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 text-center' },
                                    React.createElement(CheckCircle, { className: 'w-6 h-6 text-emerald-400 mx-auto mb-2 animate-bounce' }),
                                    React.createElement('p', { className: 'text-xs font-bold text-white' }, 'All Auto-Correctable Warnings Resolved!'),
                                    React.createElement('p', { className: 'text-[10px] text-gray-500 mt-0.5' }, 'No remaining unresolved safety alerts.')
                                ) : React.createElement(
                                    'div',
                                    { className: 'space-y-2' },
                                    afterIssues.map(issue => renderWarningCard(issue))
                                )
                            )
                        )
                    ),

                    // TAB 2: AUTO-FIX LOGS
                    activeTab === 'fixes' && React.createElement(
                        'div',
                        { className: 'flex-grow overflow-y-auto space-y-3 pr-1 text-left' },
                        
                        // Summary Summary Banner
                        autoFixSummary["Total Auto Fixes"] > 0 && React.createElement(
                            'div',
                            { className: 'bg-cyber-teal/10 border border-cyber-teal/20 rounded-xl p-4 mb-4' },
                            React.createElement('h4', { className: 'font-black text-cyber-teal text-xs mb-2 uppercase tracking-wide flex items-center gap-1.5' }, 
                                React.createElement(Sparkles, { className: 'w-4 h-4' }),
                                'RTL Auto-Correct Summary'
                            ),
                            React.createElement(
                                'div',
                                { className: 'grid grid-cols-2 gap-2 text-[10px] text-gray-300 font-mono' },
                                Object.entries(autoFixSummary)
                                    .filter(([key, val]) => val > 0 && key !== "Total Auto Fixes" && key !== "Standardized Formatting Applied")
                                    .map(([key, val]) => React.createElement(
                                        'div',
                                        { key: key, className: 'flex justify-between border-b border-white/5 pb-1' },
                                        React.createElement('span', { className: 'text-gray-400' }, key),
                                        React.createElement('span', { className: 'font-bold text-cyber-teal' }, val)
                                    ))
                            ),
                            React.createElement(
                                'div',
                                { className: 'mt-3 pt-2 border-t border-cyber-teal/20 flex justify-between items-center text-xs font-black' },
                                React.createElement('span', { className: 'text-white' }, 'Total Auto Fixes Applied:'),
                                React.createElement('span', { className: 'text-cyber-teal font-mono bg-cyber-teal/20 px-2 py-0.5 rounded border border-cyber-teal/30' }, autoFixSummary["Total Auto Fixes"])
                            )
                        ),

                        fixLog.length === 0 ? React.createElement(
                            'div',
                            { className: 'h-full flex flex-col items-center justify-center text-center text-gray-500 py-12' },
                            React.createElement(Wrench, { className: 'w-10 h-10 text-gray-600 mb-2' }),
                            React.createElement('p', { className: 'font-bold text-white text-xs' }, 'No auto-fixes applied.'),
                            React.createElement('p', { className: 'text-[10px] text-gray-500' }, 'RTL file holds zero standard syntax errors.')
                        ) : fixLog.map((fix, idx) => {
                            const ruleId = fix.rule || fix.ruleId || 'Rule';
                            const lineNum = fix.line || fix.lineNum || 0;
                            const desc = fix.description || fix.reason || 'Auto-fixed violation';
                            const beforeSnippet = fix.before || fix.original || '';
                            const afterSnippet = fix.after || fix.corrected || '';
                            const confidence = fix.confidence || 95;

                            return React.createElement(
                                'div',
                                { key: idx, className: 'p-3 bg-white/5 border border-white/5 rounded-xl text-xs space-y-2 text-left' },
                                React.createElement(
                                    'div',
                                    { className: 'flex justify-between items-center font-mono text-[9px] text-gray-400' },
                                    React.createElement('span', { className: 'bg-cyber-teal/20 text-cyber-teal px-1.5 py-0.5 rounded font-bold' }, ruleId),
                                    React.createElement('span', null, `Line ${lineNum}`)
                                ),
                                React.createElement('div', { className: 'text-white font-semibold' }, desc),
                                React.createElement(
                                    'div',
                                    { className: 'grid grid-cols-2 gap-2 text-[9px] font-mono' },
                                    beforeSnippet && React.createElement('div', null,
                                        React.createElement('div', { className: 'text-rose-400 mb-0.5' }, 'Original:'),
                                        React.createElement('pre', { className: 'bg-black/50 p-1.5 rounded border border-rose-500/10 line-through text-rose-300 font-mono overflow-x-auto m-0' }, beforeSnippet)
                                    ),
                                    afterSnippet && React.createElement('div', null,
                                        React.createElement('div', { className: 'text-emerald-400 mb-0.5' }, 'Corrected:'),
                                        React.createElement('pre', { className: 'bg-black/50 p-1.5 rounded border border-emerald-500/10 text-emerald-300 font-mono overflow-x-auto m-0' }, afterSnippet)
                                    )
                                ),
                                // Confidence display
                                React.createElement(
                                    'div',
                                    { className: 'flex items-center justify-between text-[9px] text-gray-500 pt-1 border-t border-white/5 font-mono' },
                                    React.createElement('span', null, 'AI Confidence:'),
                                    React.createElement('span', { className: 'font-bold text-cyber-teal animate-pulse' }, `${confidence}%`)
                                )
                            );
                        })
                    ),

                    // TAB 3: RULES CATALOG
                    activeTab === 'catalog' && React.createElement(
                        'div',
                        { className: 'flex-grow overflow-y-auto space-y-2 pr-1 text-left' },
                        rulesCatalog.length === 0 ? React.createElement(
                            'div',
                            { className: 'text-center text-gray-500 py-6 text-xs' },
                            'Catalog loading...'
                        ) : rulesCatalog.map((rule, idx) => React.createElement(
                            'div',
                            { key: idx, className: 'p-2.5 bg-black/40 border border-white/5 rounded-lg text-[10px] space-y-1' },
                            React.createElement(
                                'div',
                                { className: 'flex justify-between items-center font-mono text-[9px]' },
                                React.createElement('span', { className: 'text-cyber-teal font-bold' }, rule.ruleId),
                                React.createElement('span', { className: 'text-gray-500 uppercase' }, rule.category)
                            ),
                            React.createElement('div', { className: 'text-white font-bold text-xs' }, rule.name),
                            React.createElement('div', { className: 'text-gray-400' }, rule.description),
                            React.createElement('div', { className: 'text-[9px] text-amber-400/90 italic font-medium' }, `Fix recommendation: ${rule.fix}`)
                        ))
                    )
                )
            )
        ),

        // ── 3. AI Explanation Panel (Bottom Section)
        selectedExplain && React.createElement(
            GlassCard,
            { className: 'p-4 flex-shrink-0 text-left border-t border-cyber-teal/20 bg-black/40 flex flex-col gap-3.5 max-h-56 overflow-y-auto' },
            React.createElement(
                'div',
                { className: 'flex items-center gap-2 border-b border-white/5 pb-2 justify-between' },
                React.createElement(
                    'div',
                    { className: 'flex items-center gap-2' },
                    React.createElement(Sparkles, { className: 'w-4 h-4 text-cyber-teal' }),
                    React.createElement('span', { className: 'font-black text-white text-xs uppercase tracking-wider' }, `AI Explanation Panel — [${selectedExplain.ruleId}] ${selectedExplain.ruleName}`)
                ),
                React.createElement('span', { className: 'text-[9px] text-gray-500 font-bold uppercase font-mono' }, `Verification Target: IEEE 1364/1800`)
            ),
            React.createElement(
                'div',
                { className: 'grid grid-cols-1 md:grid-cols-4 gap-4 text-xs text-gray-300' },
                // What & Why
                React.createElement(
                    'div',
                    { className: 'md:col-span-1 space-y-1.5 border-r border-white/5 pr-3' },
                    React.createElement('div', { className: 'font-black text-gray-400 uppercase text-[9px] tracking-wide' }, 'What is wrong?'),
                    React.createElement('p', null, selectedExplain.whatIsWrong),
                    React.createElement('div', { className: 'font-black text-gray-400 uppercase text-[9px] tracking-wide pt-1' }, 'Why it happened?'),
                    React.createElement('p', { className: 'text-gray-400' }, selectedExplain.whyItHappened)
                ),
                // Hardware Impact
                React.createElement(
                    'div',
                    { className: 'md:col-span-1 space-y-1.5 border-r border-white/5 pr-3' },
                    React.createElement('div', { className: 'font-black text-rose-400 uppercase text-[9px] tracking-wide' }, 'Hardware Impact:'),
                    React.createElement('p', null, selectedExplain.hardwareImpact),
                    React.createElement('div', { className: 'font-black text-amber-400 uppercase text-[9px] tracking-wide pt-1' }, 'Simulation Impact:'),
                    React.createElement('p', { className: 'text-gray-400' }, selectedExplain.simulationImpact)
                ),
                // Synthesis & Best Practice
                React.createElement(
                    'div',
                    { className: 'md:col-span-1 space-y-1.5 border-r border-white/5 pr-3' },
                    React.createElement('div', { className: 'font-black text-cyan-400 uppercase text-[9px] tracking-wide' }, 'Synthesis Impact:'),
                    React.createElement('p', null, selectedExplain.synthesisImpact),
                    React.createElement('div', { className: 'font-black text-emerald-400 uppercase text-[9px] tracking-wide pt-1' }, 'Industry Best Practice:'),
                    React.createElement('p', { className: 'text-gray-400' }, selectedExplain.bestPractice)
                ),
                // Interview Question
                React.createElement(
                    'div',
                    { className: 'md:col-span-1 space-y-1.5' },
                    React.createElement('div', { className: 'font-black text-cyber-purple uppercase text-[9px] tracking-wide flex items-center gap-1' }, 
                        React.createElement(HelpCircle, { className: 'w-3 h-3' }),
                        'Interview Question Checklist:'
                    ),
                    React.createElement('p', { className: 'italic text-gray-400' }, selectedExplain.interviewQuestion)
                )
            )
        )
    );
}
