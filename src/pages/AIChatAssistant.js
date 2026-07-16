import React, { useState, useEffect, useRef } from 'https://esm.sh/react@18.2.0';
import { useAppState } from '../utils/appState.js';
import { apiChat } from '../utils/api.js';
import { ChatMessage, ChatTypingIndicator } from '../components/ChatMessage.js';
import GlassCard from '../components/GlassCard.js';
import { Send, Cpu, MessageSquare, Trash2, Copy, Check, Zap, BookOpen, Wrench, TrendingUp } from 'https://esm.sh/lucide-react@0.344.0';

const QUICK_PROMPTS = [
    { icon: '🔴', label: 'Explain Error', prompt: 'Explain the top error detected in my current RTL file and how to fix it.' },
    { icon: '🔧', label: 'Fix Latches', prompt: 'How do I fix latch inference issues in my Verilog design?' },
    { icon: '📐', label: 'FSM Best Practices', prompt: 'What are the best practices for coding a Finite State Machine in SystemVerilog?' },
    { icon: '⏱️', label: 'CDC Issues', prompt: 'Explain Clock Domain Crossing (CDC) issues and how to handle them in RTL design.' },
    { icon: '⚡', label: 'Optimize RTL', prompt: 'Suggest RTL optimization techniques to reduce area and improve performance.' },
    { icon: '🧪', label: 'Testbench Tips', prompt: 'How do I write a self-checking testbench for a sequential Verilog module?' },
    { icon: '🔒', label: 'Blocking vs <=', prompt: 'When should I use blocking (=) vs non-blocking (<=) assignments in Verilog?' },
    { icon: '🏗️', label: 'Synthesis Errors', prompt: 'What Verilog constructs are not synthesizable and should be avoided in RTL?' },
];

export default function AIChatAssistant() {
    const { user, activeFile } = useAppState();
    const [messages, setMessages] = useState([
        {
            id: 1,
            role: 'ai',
            content: `**Welcome to RTLGuard AI Assistant! ⚡**

I'm your expert RTL design and verification companion. I can help you with:

- **Bug Explanations** — Why an error occurs and how to fix it
- **RTL Coding** — Best practices for Verilog/SystemVerilog
- **Verification** — Testbench strategies, assertions, coverage
- **Timing Analysis** — CDC, setup/hold violations, critical paths
- **Synthesis** — What's synthesizable, area/power optimization

${activeFile ? `📁 **Active File:** \`${activeFile.name}\` — I have context of your current RTL code.` : '💡 Load a file in RTL Analyzer to give me context of your design.'}

Type a question below or pick a quick prompt to get started!`,
            timestamp: new Date().toLocaleTimeString()
        }
    ]);
    const [input, setInput] = useState('');
    const [typing, setTyping] = useState(false);
    const [copied, setCopied] = useState(false);
    const messagesEndRef = useRef(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, typing]);

    const sendMessage = async (text) => {
        const userMsg = text || input.trim();
        if (!userMsg) return;

        setInput('');
        const newId = Date.now();
        setMessages(prev => [...prev, {
            id: newId,
            role: 'user',
            content: userMsg,
            timestamp: new Date().toLocaleTimeString()
        }]);
        setTyping(true);

        try {
            const rtlCtx = activeFile?.content || '';
            const issuesCtx = activeFile?.analysisResult?.issues || [];
            const res = await apiChat(userMsg, rtlCtx, issuesCtx, user?.userId || '');

            setMessages(prev => [...prev, {
                id: newId + 1,
                role: 'ai',
                content: res.answer || 'I could not generate a response. Please try again.',
                timestamp: new Date().toLocaleTimeString()
            }]);
        } catch (e) {
            setMessages(prev => [...prev, {
                id: newId + 1,
                role: 'ai',
                content: `**Connection Error**\n\nI couldn't reach the backend. Please ensure the RTLGuard server is running at http://localhost:5000\n\nError: ${e.message}`,
                timestamp: new Date().toLocaleTimeString()
            }]);
        } finally {
            setTyping(false);
        }
    };

    const clearChat = () => {
        setMessages([{
            id: Date.now(),
            role: 'ai',
            content: 'Chat cleared. How can I help you with your RTL design?',
            timestamp: new Date().toLocaleTimeString()
        }]);
    };

    const copyLastResponse = () => {
        const last = [...messages].reverse().find(m => m.role === 'ai');
        if (last) {
            navigator.clipboard.writeText(last.content);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const handleKey = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    return React.createElement(
        'div',
        { className: 'flex-1 flex flex-col h-[calc(100vh-80px)] bg-cyber-black overflow-hidden' },

        // ── Header
        React.createElement(
            'div',
            { className: 'flex-shrink-0 flex items-center justify-between px-6 py-4 border-b border-white/5 bg-cyber-dark/50' },
            React.createElement(
                'div',
                { className: 'flex items-center gap-3' },
                React.createElement('div', { className: 'p-2 rounded-xl bg-gradient-to-br from-cyber-purple to-cyber-neon glow-purple' },
                    React.createElement(MessageSquare, { className: 'w-5 h-5 text-white' })
                ),
                React.createElement('div', null,
                    React.createElement('h1', { className: 'font-extrabold text-lg text-white tracking-wide' }, 'AI RTL Assistant'),
                    React.createElement('p', { className: 'text-xs text-gray-500' },
                        activeFile ? `Context: ${activeFile.name}` : 'No file loaded — general RTL expert mode'
                    )
                )
            ),
            React.createElement(
                'div',
                { className: 'flex items-center gap-2' },
                React.createElement(
                    'button',
                    { onClick: copyLastResponse, className: 'flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 hover:border-cyber-teal text-xs text-gray-400 hover:text-cyber-teal transition-all' },
                    React.createElement(copied ? Check : Copy, { className: 'w-3.5 h-3.5' }),
                    copied ? 'Copied!' : 'Copy Last'
                ),
                React.createElement(
                    'button',
                    { onClick: clearChat, className: 'flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 hover:border-rose-500 text-xs text-gray-400 hover:text-rose-400 transition-all' },
                    React.createElement(Trash2, { className: 'w-3.5 h-3.5' }),
                    'Clear'
                )
            )
        ),

        // ── Main layout
        React.createElement(
            'div',
            { className: 'flex-1 flex min-h-0' },

            // Left: Quick Prompts
            React.createElement(
                'div',
                { className: 'w-56 flex-shrink-0 border-r border-white/5 bg-cyber-dark/30 p-4 overflow-y-auto hidden lg:block' },
                React.createElement('p', { className: 'text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3' }, 'Quick Prompts'),
                React.createElement(
                    'div',
                    { className: 'space-y-2' },
                    QUICK_PROMPTS.map(q =>
                        React.createElement(
                            'button',
                            {
                                key: q.label,
                                onClick: () => sendMessage(q.prompt),
                                className: 'w-full text-left flex items-center gap-2 px-3 py-2.5 rounded-xl bg-white/3 border border-white/5 hover:border-cyber-purple/40 hover:bg-cyber-purple/5 text-xs text-gray-400 hover:text-white transition-all group'
                            },
                            React.createElement('span', { className: 'text-base' }, q.icon),
                            React.createElement('span', { className: 'font-medium' }, q.label)
                        )
                    )
                )
            ),

            // Center: Chat
            React.createElement(
                'div',
                { className: 'flex-1 flex flex-col min-w-0' },
                // Messages
                React.createElement(
                    'div',
                    { className: 'flex-1 overflow-y-auto px-4 py-6 space-y-4' },
                    messages.map(msg =>
                        React.createElement(ChatMessage, { key: msg.id, role: msg.role, content: msg.content, timestamp: msg.timestamp })
                    ),
                    typing && React.createElement(ChatTypingIndicator),
                    React.createElement('div', { ref: messagesEndRef })
                ),

                // Input area
                React.createElement(
                    'div',
                    { className: 'flex-shrink-0 px-4 py-4 border-t border-white/5 bg-cyber-dark/30' },
                    React.createElement(
                        'div',
                        { className: 'flex gap-3 items-end max-w-4xl mx-auto' },
                        React.createElement(
                            'div',
                            { className: 'flex-1 relative' },
                            React.createElement('textarea', {
                                value: input,
                                onChange: e => setInput(e.target.value),
                                onKeyDown: handleKey,
                                placeholder: 'Ask about RTL design, Verilog errors, synthesis, timing... (Enter to send)',
                                rows: 2,
                                className: 'w-full bg-[#070a13] border border-white/10 focus:border-cyber-purple rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 resize-none outline-none transition-all duration-200 font-mono leading-relaxed'
                            })
                        ),
                        React.createElement(
                            'button',
                            {
                                onClick: () => sendMessage(),
                                disabled: !input.trim() || typing,
                                className: 'flex-shrink-0 w-11 h-11 rounded-xl bg-gradient-to-br from-cyber-purple to-cyber-neon text-white flex items-center justify-center hover:opacity-90 disabled:opacity-40 transition-all active:scale-95 shadow-lg'
                            },
                            React.createElement(Send, { className: 'w-4 h-4' })
                        )
                    ),
                    React.createElement(
                        'p',
                        { className: 'text-center text-[10px] text-gray-600 mt-2' },
                        'RTLGuard AI • Powered by knowledge base | For real Gemini AI, add GEMINI_API_KEY to backend/.env'
                    )
                )
            )
        )
    );
}
