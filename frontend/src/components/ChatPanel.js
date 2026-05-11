import React, { useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Send, Bot, User, AlertCircle, FileText, Zap } from 'lucide-react';

function SourceBadge({ sources }) {
  if (!sources?.length) return null;
  return (
    <div style={styles.sourcesRow}>
      {sources.map(s => (
        <span key={s.index} style={styles.sourceBadge}>
          <FileText size={10} /> {s.filename}
        </span>
      ))}
    </div>
  );
}

function Message({ msg }) {
  const isUser = msg.role === 'user';
  return (
    <div style={{ ...styles.msgWrapper, ...(isUser ? styles.msgWrapperUser : {}) }}
      className="msg-anim">
      <div style={{ ...styles.avatar, ...(isUser ? styles.avatarUser : styles.avatarBot) }}>
        {isUser ? <User size={14} /> : <Bot size={14} />}
      </div>
      <div style={{ ...styles.bubble, ...(isUser ? styles.bubbleUser : styles.bubbleBot) }}>
        {msg.sources && <SourceBadge sources={msg.sources} />}
        {isUser ? (
          <p style={styles.userText}>{msg.content}</p>
        ) : (
          <div className="md-content">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
            {msg.streaming && (
              <span style={styles.cursor} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ChatPanel({ messages, input, setInput, onSend, loading, selectedIds }) {
  const bottomRef = useRef();
  const textRef = useRef();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSend(); }
  };

  const canSend = input.trim() && selectedIds.length > 0 && !loading;

  return (
    <div style={styles.chat}>
      {/* Messages */}
      <div style={styles.messages}>
        {messages.length === 0 && (
          <div style={styles.empty}>
            <div style={styles.emptyIcon}><Zap size={28} style={{ color: 'var(--accent)' }} /></div>
            <h2 style={styles.emptyTitle}>Document Intelligence</h2>
            <p style={styles.emptyText}>
              Upload PDFs in the sidebar, select them, then ask anything about their contents.
            </p>
            <div style={styles.suggestions}>
              {['Summarize the key points', 'What are the main conclusions?', 'List all mentioned dates'].map(s => (
                <button key={s} style={styles.suggestionBtn}
                  onClick={() => { setInput(s); textRef.current?.focus(); }}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((msg, i) => <Message key={i} msg={msg} />)}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={styles.inputArea}>
        {selectedIds.length === 0 && (
          <div style={styles.warning}>
            <AlertCircle size={13} /> Select at least one document from the sidebar to start chatting.
          </div>
        )}
        <div style={styles.inputRow}>
          <textarea
            ref={textRef}
            style={styles.textarea}
            placeholder={selectedIds.length === 0 ? 'Select a document first…' : 'Ask anything about your documents…'}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            rows={1}
            disabled={selectedIds.length === 0 || loading}
          />
          <button
            style={{ ...styles.sendBtn, ...(canSend ? styles.sendBtnActive : {}) }}
            onClick={onSend}
            disabled={!canSend}
          >
            {loading
              ? <span style={styles.loadingDots}><span /><span /><span /></span>
              : <Send size={16} />}
          </button>
        </div>
        <div style={styles.hint}>
          Press <kbd style={styles.kbd}>Enter</kbd> to send · <kbd style={styles.kbd}>Shift+Enter</kbd> for newline
        </div>
      </div>
    </div>
  );
}

const styles = {
  chat: { flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, overflow: 'hidden' },
  messages: {
    flex: 1, overflowY: 'auto', padding: '24px 0',
    display: 'flex', flexDirection: 'column', gap: 8,
  },
  empty: {
    flex: 1, display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    textAlign: 'center', padding: '60px 32px', gap: 14,
  },
  emptyIcon: {
    width: 56, height: 56, borderRadius: 16,
    background: 'var(--accent-glow)',
    border: '1px solid rgba(124,106,255,0.3)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  emptyTitle: {
    fontFamily: 'var(--display)', fontWeight: 800,
    fontSize: 22, color: 'var(--text-1)',
  },
  emptyText: { color: 'var(--text-2)', fontSize: 14, maxWidth: 380, lineHeight: 1.6 },
  suggestions: { display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginTop: 8 },
  suggestionBtn: {
    background: 'var(--bg-3)', border: '1px solid var(--border)',
    borderRadius: 20, padding: '7px 14px', fontSize: 12.5,
    color: 'var(--text-2)', cursor: 'pointer', fontFamily: 'var(--sans)',
    transition: 'all 0.15s',
  },
  msgWrapper: {
    display: 'flex', gap: 12, padding: '4px 24px',
    animation: 'slide-up 0.25s ease both',
  },
  msgWrapperUser: { flexDirection: 'row-reverse' },
  avatar: {
    width: 30, height: 30, borderRadius: 8, flexShrink: 0,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    marginTop: 2,
  },
  avatarBot: { background: 'var(--accent-glow)', border: '1px solid rgba(124,106,255,0.3)', color: 'var(--accent-2)' },
  avatarUser: { background: 'var(--bg-4)', border: '1px solid var(--border)', color: 'var(--text-2)' },
  bubble: {
    maxWidth: '72%', borderRadius: 'var(--radius)',
    padding: '12px 16px', lineHeight: 1.65, fontSize: 14,
  },
  bubbleBot: { background: 'var(--bg-2)', border: '1px solid var(--border)' },
  bubbleUser: { background: 'var(--accent)', color: '#fff' },
  userText: { color: '#fff', margin: 0 },
  sourcesRow: { display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  sourceBadge: {
    display: 'inline-flex', alignItems: 'center', gap: 4,
    background: 'var(--bg-4)', border: '1px solid var(--border)',
    borderRadius: 20, padding: '2px 9px', fontSize: 11,
    color: 'var(--accent-2)', fontFamily: 'var(--mono)',
  },
  cursor: {
    display: 'inline-block', width: 2, height: '1em',
    background: 'var(--accent)', marginLeft: 2, verticalAlign: 'text-bottom',
    animation: 'pulse-dot 0.8s ease-in-out infinite',
  },
  inputArea: {
    borderTop: '1px solid var(--border)',
    padding: '16px 24px 18px',
    background: 'var(--bg)',
    display: 'flex', flexDirection: 'column', gap: 8,
  },
  warning: {
    display: 'flex', alignItems: 'center', gap: 7,
    fontSize: 12, color: 'var(--amber)',
    padding: '7px 12px', background: 'rgba(251,191,36,0.08)',
    borderRadius: 'var(--radius-sm)', border: '1px solid rgba(251,191,36,0.18)',
  },
  inputRow: { display: 'flex', gap: 10, alignItems: 'flex-end' },
  textarea: {
    flex: 1, resize: 'none', background: 'var(--bg-3)',
    border: '1px solid var(--border-bright)', borderRadius: 'var(--radius)',
    padding: '12px 16px', color: 'var(--text-1)', fontSize: 14,
    fontFamily: 'var(--sans)', lineHeight: 1.5, outline: 'none',
    transition: 'border-color 0.15s', minHeight: 48, maxHeight: 160,
    ':focus': { borderColor: 'var(--accent)' },
  },
  sendBtn: {
    width: 48, height: 48, borderRadius: 'var(--radius)', border: 'none',
    background: 'var(--bg-4)', color: 'var(--text-3)',
    cursor: 'not-allowed', display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0, transition: 'all 0.15s',
  },
  sendBtnActive: {
    background: 'var(--accent)', color: '#fff', cursor: 'pointer',
    boxShadow: '0 0 20px var(--accent-glow)',
  },
  loadingDots: {
    display: 'flex', gap: 4,
    '& span': {
      width: 5, height: 5, borderRadius: '50%',
      background: '#fff', animation: 'pulse-dot 0.8s ease-in-out infinite',
    },
  },
  hint: {
    fontSize: 11, color: 'var(--text-3)',
    display: 'flex', alignItems: 'center', gap: 4,
  },
  kbd: {
    background: 'var(--bg-4)', border: '1px solid var(--border)',
    borderRadius: 4, padding: '1px 5px', fontSize: 10,
    fontFamily: 'var(--mono)', color: 'var(--text-2)',
  },
};
