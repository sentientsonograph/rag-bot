import React, { useState, useEffect } from 'react';
import DocumentPanel from './components/DocumentPanel';
import ChatPanel from './components/ChatPanel';
import { queryStream, listDocuments } from './utils/api';
import { Cpu } from 'lucide-react';

export default function App() {
  const [docs, setDocs] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    listDocuments().then(setDocs).catch(() => {});
  }, []);

  const handleSend = async () => {
    const question = input.trim();
    if (!question || !selectedIds.length || loading) return;

    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: question }]);
    setLoading(true);

    // Add placeholder bot message
    const botIdx = messages.length + 1;
    setMessages(prev => [...prev, { role: 'assistant', content: '', streaming: true, sources: null }]);

    try {
      let text = '';
      let sources = null;
      for await (const event of queryStream(selectedIds, question)) {
        if (event.type === 'sources') {
          sources = event.sources;
          setMessages(prev => {
            const next = [...prev];
            next[next.length - 1] = { ...next[next.length - 1], sources };
            return next;
          });
        } else if (event.type === 'text') {
          text += event.content;
          setMessages(prev => {
            const next = [...prev];
            next[next.length - 1] = { ...next[next.length - 1], content: text };
            return next;
          });
        } else if (event.type === 'done') {
          setMessages(prev => {
            const next = [...prev];
            next[next.length - 1] = { ...next[next.length - 1], streaming: false };
            return next;
          });
        }
      }
    } catch (e) {
      setMessages(prev => {
        const next = [...prev];
        next[next.length - 1] = {
          role: 'assistant', content: `⚠️ Error: ${e.message}`,
          streaming: false, sources: null,
        };
        return next;
      });
    }
    setLoading(false);
  };

  return (
    <div style={styles.root}>
      {/* Top bar */}
      <header style={styles.header}>
        <div style={styles.logo}>
          <Cpu size={18} style={{ color: 'var(--accent)' }} />
          <span style={styles.logoText}>RAG<span style={{ color: 'var(--accent)' }}>Bot</span></span>
        </div>
        <div style={styles.headerMeta}>
          <span style={styles.badge}>Gemini 2.0 Flash</span>
          <span style={styles.badge}>text-embedding-004</span>
        </div>
      </header>

      {/* Body */}
      <div style={styles.body}>
        <DocumentPanel
          docs={docs} setDocs={setDocs}
          selectedIds={selectedIds} setSelectedIds={setSelectedIds}
        />
        <ChatPanel
          messages={messages}
          input={input} setInput={setInput}
          onSend={handleSend}
          loading={loading}
          selectedIds={selectedIds}
        />
      </div>
    </div>
  );
}

const styles = {
  root: { height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  header: {
    height: 52, borderBottom: '1px solid var(--border)',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '0 20px', background: 'var(--bg-2)', flexShrink: 0,
  },
  logo: { display: 'flex', alignItems: 'center', gap: 9 },
  logoText: {
    fontFamily: 'var(--display)', fontWeight: 800, fontSize: 18,
    letterSpacing: '-0.02em', color: 'var(--text-1)',
  },
  headerMeta: { display: 'flex', gap: 8 },
  badge: {
    fontFamily: 'var(--mono)', fontSize: 11,
    background: 'var(--bg-4)', border: '1px solid var(--border)',
    borderRadius: 20, padding: '3px 10px', color: 'var(--text-3)',
  },
  body: { flex: 1, display: 'flex', overflow: 'hidden' },
};
