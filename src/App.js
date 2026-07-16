import React from 'https://esm.sh/react@18.2.0';
import { AppStateProvider, useAppState } from './utils/appState.js';
import Sidebar from './components/Sidebar.js';
import Navbar from './components/Navbar.js';

// Page Imports
import LandingPage         from './pages/LandingPage.js';
import LoginPage           from './pages/LoginPage.js';
import Dashboard           from './pages/Dashboard.js';
import RTLAnalyzer         from './pages/RTLAnalyzer.js';
import Reports             from './pages/Reports.js';
import AboutPage           from './pages/AboutPage.js';
import TestbenchGenerator  from './pages/TestbenchGenerator.js';
import CoverageAnalysis    from './pages/CoverageAnalysis.js';
import AIChatAssistant     from './pages/AIChatAssistant.js';
import Visualization       from './pages/Visualization.js';
import Settings            from './pages/Settings.js';
import RulesDatabase       from './pages/RulesDatabase.js';

// ─────────────────────────────────────────────
// Global Error Boundary — catches any JS crash
// and shows a readable error instead of black screen
// ─────────────────────────────────────────────
class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null, info: null };
    }
    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }
    componentDidCatch(error, info) {
        this.setState({ info });
        console.error('[RTLGuard ErrorBoundary]', error, info);
    }
    render() {
        if (this.state.hasError) {
            return React.createElement(
                'div',
                { style: { minHeight: '100vh', background: '#030712', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' } },
                React.createElement(
                    'div',
                    { style: { maxWidth: 640, width: '100%', background: 'rgba(255,0,50,0.08)', border: '1px solid rgba(255,0,50,0.3)', borderRadius: 16, padding: '2rem' } },
                    React.createElement('h2', { style: { color: '#ff4060', fontFamily: 'monospace', fontSize: 18, marginBottom: 12 } }, '⚠ RTLGuard — Render Error'),
                    React.createElement('p', { style: { color: '#f87171', fontFamily: 'monospace', fontSize: 13, marginBottom: 16 } }, String(this.state.error)),
                    this.state.info && React.createElement(
                        'pre',
                        { style: { color: '#6b7280', fontFamily: 'monospace', fontSize: 11, whiteSpace: 'pre-wrap', overflow: 'auto', maxHeight: 300 } },
                        this.state.info.componentStack
                    ),
                    React.createElement(
                        'button',
                        {
                            onClick: () => { this.setState({ hasError: false, error: null, info: null }); window.location.reload(); },
                            style: { marginTop: 16, padding: '8px 20px', background: '#00f2fe', color: '#000', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontFamily: 'monospace' }
                        },
                        'Reload App'
                    )
                )
            );
        }
        return this.props.children;
    }
}

function MainAppContent() {
    const { activeView, user, theme } = useAppState();

    // Apply light theme class to document
    React.useEffect(() => {
        if (theme === 'light') {
            document.documentElement.classList.remove('dark');
            document.documentElement.classList.add('light-theme');
        } else {
            document.documentElement.classList.add('dark');
            document.documentElement.classList.remove('light-theme');
        }
    }, [theme]);

    const renderActiveView = () => {
        switch (activeView) {
            case 'landing':      return React.createElement(LandingPage);
            case 'login':        return React.createElement(LoginPage);
            case 'dashboard':    return React.createElement(Dashboard);
            case 'analyzer':     return React.createElement(RTLAnalyzer);
            case 'reports':      return React.createElement(Reports);
            case 'about':        return React.createElement(AboutPage);
            case 'testbench':    return React.createElement(TestbenchGenerator);
            case 'coverage':     return React.createElement(CoverageAnalysis);
            case 'chat':         return React.createElement(AIChatAssistant);
            case 'visualization':return React.createElement(Visualization);
            case 'settings':     return React.createElement(Settings);
            case 'rules':        return React.createElement(RulesDatabase);
            default:             return React.createElement(LandingPage);
        }
    };

    const isFullScreenPage = activeView === 'landing' || activeView === 'login' || !user;

    if (isFullScreenPage) {
        return React.createElement(
            'main',
            { className: 'flex-1 flex flex-col min-h-screen' },
            renderActiveView()
        );
    }

    return React.createElement(
        'div',
        { className: 'flex min-h-screen bg-cyber-black text-gray-100 overflow-hidden' },
        React.createElement(Sidebar),
        React.createElement(
            'div',
            { className: 'flex-1 flex flex-col min-w-0 h-screen overflow-hidden' },
            React.createElement(Navbar),
            React.createElement(
                'main',
                { className: 'flex-1 overflow-hidden flex flex-col bg-cyber-black' },
                renderActiveView()
            )
        )
    );
}

export default function App() {
    return React.createElement(
        ErrorBoundary,
        null,
        React.createElement(
            AppStateProvider,
            null,
            React.createElement(MainAppContent)
        )
    );
}
