import React, { useState } from 'https://esm.sh/react@18.2.0';
import { useAppState } from '../utils/appState.js';
import GlassCard from '../components/GlassCard.js';
import { 
    apiExportHTML, 
    apiExportJSON, 
    apiExportCSV, 
    apiExportPDF 
} from '../utils/api.js';
import { 
    Download, 
    FileText, 
    Check, 
    ChevronRight, 
    Cpu, 
    Shield, 
    AlertOctagon, 
    Activity, 
    ClipboardList,
    FileSpreadsheet,
    Layers,
    FileCode,
    Sparkles,
    Printer
} from 'https://esm.sh/lucide-react@0.344.0';

export default function Reports() {
    const { files } = useAppState();
    const [selectedForCompare, setSelectedForCompare] = useState([]);

    const handleCompareSelect = (fileId) => {
        setSelectedForCompare(prev => {
            if (prev.includes(fileId)) {
                return prev.filter(id => id !== fileId);
            }
            if (prev.length >= 2) {
                return [prev[0], fileId];
            }
            return [...prev, fileId];
        });
    };

    const handleDownloadLocalFile = (filename, content) => {
        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    const compareFiles = selectedForCompare.map(id => files.find(f => f.id === id)).filter(Boolean);

    return React.createElement(
        'div',
        { className: 'flex-1 p-6 space-y-6 bg-cyber-black overflow-y-auto max-h-[calc(100vh-80px)] font-sans' },
        
        // Header
        React.createElement(
            'div',
            { className: 'border-b border-white/5 pb-4' },
            React.createElement('h1', { className: 'text-2xl font-extrabold tracking-wider bg-gradient-to-r from-cyber-blue via-cyber-teal to-cyber-neon bg-clip-text text-transparent' }, 'REPORTS & EXPORT AUDIT'),
            React.createElement('p', { className: 'text-xs text-gray-500 mt-1' }, 'Generate, print, and export structured verification documentation packages.')
        ),

        // Main compare & export layout
        React.createElement(
            'div',
            { className: 'grid grid-cols-1 lg:grid-cols-3 gap-6' },
            
            // Left: File selection table for comparison (2/3 width)
            React.createElement(
                GlassCard,
                { className: 'lg:col-span-2 p-5' },
                React.createElement('h3', { className: 'font-bold text-white text-md mb-1' }, 'RTL Compliance Reports Archive'),
                React.createElement('p', { className: 'text-xs text-gray-500 mb-5' }, 'Select up to two design runs to view side-by-side performance comparison'),
                
                React.createElement(
                    'div',
                    { className: 'overflow-x-auto w-full' },
                    files.length === 0 ? React.createElement(
                        'div',
                        { className: 'py-12 text-center text-gray-500 text-xs' },
                        'No design logs uploaded yet.'
                    ) : React.createElement(
                        'table',
                        { className: 'w-full text-left border-collapse text-xs font-mono' },
                        React.createElement(
                            'thead',
                            null,
                            React.createElement(
                                'tr',
                                { className: 'border-b border-white/5 text-gray-500 font-semibold uppercase tracking-wider' },
                                React.createElement('th', { className: 'pb-3 w-12' }, 'Compare'),
                                React.createElement('th', { className: 'pb-3' }, 'Module Name'),
                                React.createElement('th', { className: 'pb-3' }, 'Overall Score'),
                                React.createElement('th', { className: 'pb-3' }, 'Issues'),
                                React.createElement('th', { className: 'pb-3 text-right' }, 'Export Actions')
                            )
                        ),
                        React.createElement(
                            'tbody',
                            { className: 'divide-y divide-white/5 text-gray-300' },
                            files.map((file) => {
                                const isChecked = selectedForCompare.includes(file.id);
                                const res = file.analysisResult || { scores: {}, issues: [] };
                                return React.createElement(
                                    'tr',
                                    { key: file.id, className: 'group hover:bg-white/3' },
                                    // Checkbox Compare Select
                                    React.createElement(
                                        'td',
                                        { className: 'py-3' },
                                        React.createElement(
                                            'button',
                                            {
                                                onClick: () => handleCompareSelect(file.id),
                                                className: `w-4.5 h-4.5 rounded border flex items-center justify-center transition-all ${
                                                    isChecked 
                                                        ? 'bg-cyber-teal border-cyber-teal text-cyber-black font-extrabold' 
                                                        : 'border-white/20 hover:border-cyber-teal text-transparent'
                                                }`
                                            },
                                            React.createElement(Check, { className: 'w-3 h-3 stroke-[3px]' })
                                        ),
                                    ),
                                    // Name
                                    React.createElement(
                                        'td',
                                        { className: 'py-3 flex items-center gap-2 font-semibold text-white' },
                                        React.createElement(FileText, { className: 'w-4 h-4 text-cyber-teal' }),
                                        file.name
                                    ),
                                    // Overall Score
                                    React.createElement(
                                        'td',
                                        { className: 'py-3 font-bold text-white' },
                                        `${res.scores?.overall || 100}%`
                                    ),
                                    // Warnings Count
                                    React.createElement(
                                        'td',
                                        { className: 'py-3 text-gray-500' },
                                        `${res.issues?.length || 0} items`
                                    ),
                                    // Download Action Buttons
                                    React.createElement(
                                        'td',
                                        { className: 'py-3 text-right space-x-1.5' },
                                        React.createElement(
                                            'button',
                                            {
                                                onClick: () => apiExportHTML(file.id),
                                                title: 'Export HTML Report',
                                                className: 'px-2 py-1 rounded bg-white/5 border border-white/5 hover:border-cyber-teal hover:text-cyber-teal text-[10px] transition-all font-semibold'
                                            },
                                            'HTML'
                                        ),
                                        React.createElement(
                                            'button',
                                            {
                                                onClick: () => apiExportPDF(file.name, res.scores, res.issues, res.autoFixSummary),
                                                title: 'Export PDF Report',
                                                className: 'px-2 py-1 rounded bg-white/5 border border-white/5 hover:border-cyber-blue hover:text-cyber-blue text-[10px] transition-all font-semibold'
                                            },
                                            'PDF'
                                        ),
                                        React.createElement(
                                            'button',
                                            {
                                                onClick: () => apiExportJSON(file.id),
                                                title: 'Export JSON analysis data',
                                                className: 'px-2 py-1 rounded bg-white/5 border border-white/5 hover:border-purple-400 hover:text-purple-400 text-[10px] transition-all font-semibold'
                                            },
                                            'JSON'
                                        ),
                                        React.createElement(
                                            'button',
                                            {
                                                onClick: () => apiExportCSV(file.id),
                                                title: 'Export CSV Summary',
                                                className: 'px-2 py-1 rounded bg-white/5 border border-white/5 hover:border-cyber-green hover:text-cyber-green text-[10px] transition-all font-semibold'
                                            },
                                            'CSV'
                                        )
                                    )
                                );
                            })
                        )
                    )
                )
            ),

            // Comparison Metrics Card (1/3 width)
            React.createElement(
                GlassCard,
                { className: 'p-5 flex flex-col min-h-[300px]' },
                React.createElement('h3', { className: 'font-bold text-white text-md mb-1' }, 'Hardware Metrics Comparison'),
                React.createElement('p', { className: 'text-xs text-gray-500 mb-5' }, 'Side-by-side compliance audit check'),
                
                compareFiles.length < 2 ? React.createElement(
                    'div',
                    { className: 'flex-1 flex flex-col items-center justify-center text-center text-gray-500 text-xs px-6 py-8 gap-2' },
                    React.createElement(ClipboardList, { className: 'w-10 h-10 text-gray-600' }),
                    'Check two boxes in the reports archive to compile side-by-side compliance sheets.'
                ) : React.createElement(
                    'div',
                    { className: 'space-y-4' },
                    
                    // Header labels
                    React.createElement(
                        'div',
                        { className: 'grid grid-cols-2 gap-4 border-b border-white/5 pb-3 text-center text-[10px]' },
                        compareFiles.map((file, idx) => React.createElement(
                            'div',
                            { key: idx, className: 'overflow-hidden' },
                            React.createElement('p', { className: 'text-gray-500 font-bold uppercase' }, `Module ${idx + 1}`),
                            React.createElement('p', { className: 'font-semibold text-cyber-teal truncate mt-0.5 font-mono' }, file.name)
                        ))
                    ),

                    // Rows
                    [
                        { label: 'Overall score', key: 'overall', isScore: true, icon: Activity },
                        { label: 'Silicon Quality', key: 'quality', isScore: true, icon: Cpu },
                        { label: 'Security index', key: 'security', isScore: true, icon: Shield },
                        { label: 'Synthesizability', key: 'synthesizability', isScore: true, icon: Layers },
                        { label: 'Total warnings', key: 'issues_count', isScore: false, icon: AlertOctagon },
                    ].map((metric, idx) => {
                        const val1 = metric.isScore 
                            ? compareFiles[0].analysisResult.scores[metric.key] 
                            : metric.key === 'issues_count' ? compareFiles[0].analysisResult.issues.length : 0;
                        const val2 = metric.isScore 
                            ? compareFiles[1].analysisResult.scores[metric.key] 
                            : metric.key === 'issues_count' ? compareFiles[1].analysisResult.issues.length : 0;

                        return React.createElement(
                            'div',
                            { key: idx, className: 'space-y-1.5 border-b border-white/5 pb-3 last:border-b-0 last:pb-0' },
                            React.createElement(
                                'div',
                                { className: 'flex items-center gap-1.5 text-xs text-gray-400 font-semibold' },
                                React.createElement(metric.icon, { className: 'w-3.5 h-3.5 text-gray-500' }),
                                React.createElement('span', null, metric.label)
                            ),
                            React.createElement(
                                'div',
                                { className: 'grid grid-cols-2 gap-4 text-center font-mono font-bold' },
                                React.createElement(
                                    'span', 
                                    { className: `text-base ${metric.isScore && val1 >= val2 ? 'text-cyber-teal' : 'text-white'}` }, 
                                    metric.isScore ? `${val1}%` : val1
                                ),
                                React.createElement(
                                    'span', 
                                    { className: `text-base ${metric.isScore && val2 >= val1 ? 'text-cyber-teal' : 'text-white'}` }, 
                                    metric.isScore ? `${val2}%` : val2
                                )
                            )
                        );
                    })
                )
            )
        )
    );
}
