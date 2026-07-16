import React from 'https://esm.sh/react@18.2.0';

/**
 * ChatMessage — Renders a single AI or user chat message with markdown support
 */
export function ChatMessage({ role, content, timestamp }) {
    const isUser = role === 'user';

    function renderContent(text) {
        if (!text) return null;
        // Simple markdown: code blocks, bold, headers
        const parts = [];
        let remaining = text;
        let key = 0;

        // Process code blocks
        const codeBlockRe = /```(\w*)\n?([\s\S]*?)```/g;
        let lastIdx = 0;
        let match;
        const segments = [];

        while ((match = codeBlockRe.exec(text)) !== null) {
            if (match.index > lastIdx) {
                segments.push({ type: 'text', content: text.slice(lastIdx, match.index) });
            }
            segments.push({ type: 'code', lang: match[1], content: match[2] });
            lastIdx = match.index + match[0].length;
        }
        if (lastIdx < text.length) {
            segments.push({ type: 'text', content: text.slice(lastIdx) });
        }

        return segments.map((seg, i) => {
            if (seg.type === 'code') {
                return React.createElement(
                    'pre',
                    { key: i, className: 'bg-black/50 border border-white/10 rounded-xl p-3 mt-2 mb-2 text-[11px] text-cyan-300 font-mono overflow-x-auto' },
                    React.createElement('code', null, seg.content.trim())
                );
            }
            // Render text with inline markdown
            return React.createElement(
                'div',
                { key: i, className: 'md-content' },
                ...renderInlineMarkdown(seg.content)
            );
        });
    }

    function renderInlineMarkdown(text) {
        const lines = text.split('\n');
        return lines.map((line, i) => {
            // Headers
            if (line.startsWith('### ')) return React.createElement('h3', { key: i }, line.slice(4));
            if (line.startsWith('## '))  return React.createElement('h2', { key: i }, line.slice(3));
            if (line.startsWith('# '))   return React.createElement('h1', { key: i }, line.slice(2));
            // List items
            if (line.startsWith('- ') || line.startsWith('* ')) {
                return React.createElement('div', { key: i, className: 'flex items-start gap-1.5 my-0.5' },
                    React.createElement('span', { className: 'text-cyber-teal mt-0.5 flex-shrink-0' }, '▸'),
                    React.createElement('span', null, renderBold(line.slice(2)))
                );
            }
            // Table row (basic)
            if (line.startsWith('|')) {
                return React.createElement('div', { key: i, className: 'font-mono text-[10px] text-gray-400 border-b border-white/5 py-0.5' }, line);
            }
            // Normal line
            if (!line.trim()) return React.createElement('div', { key: i, className: 'h-2' });
            return React.createElement('p', { key: i, className: 'my-0.5' }, renderBold(line));
        });
    }

    function renderBold(text) {
        const parts = text.split(/(\*\*[^*]+\*\*)/g);
        return parts.map((p, i) => {
            if (p.startsWith('**') && p.endsWith('**')) {
                return React.createElement('strong', { key: i, className: 'text-cyber-teal font-semibold' }, p.slice(2, -2));
            }
            if (p.startsWith('`') && p.endsWith('`')) {
                return React.createElement('code', { key: i, className: 'bg-black/40 px-1.5 py-0.5 rounded text-cyan-300 text-[11px] font-mono' }, p.slice(1, -1));
            }
            return p;
        });
    }

    return React.createElement(
        'div',
        {
            className: `flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'} animate-slide-in-up`
        },
        // Avatar
        React.createElement(
            'div',
            {
                className: `w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold ${
                    isUser
                        ? 'bg-gradient-to-br from-cyber-teal to-cyber-blue text-black'
                        : 'bg-gradient-to-br from-cyber-purple to-cyber-neon text-white'
                }`
            },
            isUser ? '👤' : '⚡'
        ),
        // Bubble
        React.createElement(
            'div',
            {
                className: `max-w-[80%] flex flex-col gap-1 ${isUser ? 'items-end' : 'items-start'}`
            },
            React.createElement(
                'div',
                {
                    className: `px-4 py-3 text-sm leading-relaxed ${isUser ? 'chat-bubble-user text-white' : 'chat-bubble-ai text-gray-200'}`
                },
                renderContent(content)
            ),
            timestamp && React.createElement(
                'span',
                { className: 'text-[10px] text-gray-600 px-1' },
                timestamp
            )
        )
    );
}

export function ChatTypingIndicator() {
    return React.createElement(
        'div',
        { className: 'flex gap-3 animate-fade-in' },
        React.createElement(
            'div',
            { className: 'w-8 h-8 rounded-full bg-gradient-to-br from-cyber-purple to-cyber-neon text-white flex items-center justify-center text-sm font-bold' },
            '⚡'
        ),
        React.createElement(
            'div',
            { className: 'chat-bubble-ai px-4 py-3' },
            React.createElement(
                'div',
                { className: 'chat-typing flex items-center gap-1' },
                React.createElement('span'),
                React.createElement('span'),
                React.createElement('span')
            )
        )
    );
}
