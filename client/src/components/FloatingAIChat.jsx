import React, { useState, useRef, useEffect } from 'react';
import { egovApi } from '../services/egovApi';

const GREETING = {
  id: 'greeting',
  sender: 'ai',
  text: "Hi! I'm the eGov AI Assistant. Ask me anything about Philippine government services — TIN IDs, PhilSys, organ/blood donation regulations, or how eBuhay works.",
  time: '',
};

export default function FloatingAIChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([GREETING]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const endRef = useRef();

  useEffect(() => {
    if (open) endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

  const timeNow = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const send = async () => {
    const prompt = text.trim();
    if (!prompt || loading) return;

    setMessages(p => [...p, { id: Date.now(), sender: 'user', text: prompt, time: timeNow() }]);
    setText('');
    setLoading(true);

    try {
      const res = await egovApi.askAI(prompt, 'PH');
      setMessages(p => [...p, { id: Date.now() + 1, sender: 'ai', text: res.data, time: timeNow() }]);
    } catch (err) {
      setMessages(p => [...p, {
        id: Date.now() + 1,
        sender: 'ai',
        text: "Sorry, I couldn't reach the eGov AI service just now. Please try again in a moment.",
        time: timeNow(),
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 12 }}>
      {open && (
        <div className="card anim-in" style={{ width: 360, maxWidth: '90vw', height: 480, display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', boxShadow: 'var(--shadow-md)', background: 'white' }}>
          {/* Header */}
          <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--border)', background: 'var(--background-alt)', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary), #0284C7)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 800, fontSize: 15 }}>
              e
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, fontSize: 14 }}>eGov AI Assistant</div>
              <div style={{ fontSize: 11, color: 'var(--emerald)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--emerald)', display: 'inline-block' }} />
                Online
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              aria-label="Close chat"
              className="btn btn-ghost btn-icon"
              style={{ width: 32, height: 32, borderRadius: 'var(--r-md)' }}
            >
              ✕
            </button>
          </div>

          {/* Messages */}
          <div
            role="log"
            aria-live="polite"
            aria-label="AI chat messages"
            style={{ flex: 1, overflow: 'auto', padding: '18px', display: 'flex', flexDirection: 'column', gap: 12, background: 'white' }}
          >
            {messages.map(m => {
              const self = m.sender === 'user';
              return (
                <div key={m.id} style={{ display: 'flex', flexDirection: 'column', alignItems: self ? 'flex-end' : 'flex-start', gap: 4 }}>
                  <div className={`bubble ${self ? 'bubble-sent' : 'bubble-recv'}`} style={{ maxWidth: '85%', padding: '10px 14px', fontSize: 13, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                    {m.text}
                  </div>
                  {m.time && <span style={{ fontSize: 10, color: 'var(--foreground-subtle)', paddingInline: 4 }}>{m.time}</span>}
                </div>
              );
            })}
            {loading && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                <div className="bubble bubble-recv" style={{ padding: '10px 14px', fontSize: 13 }}>
                  <span className="spinner" style={{ width: 14, height: 14, borderWidth: 2, display: 'inline-block', verticalAlign: 'middle', marginRight: 6 }} />
                  Thinking…
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          {/* Input */}
          <div style={{ padding: '12px 14px', borderTop: '1px solid var(--border)', background: 'var(--background-alt)', display: 'flex', gap: 8, alignItems: 'flex-end' }}>
            <textarea
              className="input"
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder="Ask about eGov services…"
              rows={1}
              disabled={loading}
              style={{ resize: 'none', lineHeight: 1.5, minHeight: 40, flex: 1, fontSize: 13 }}
              aria-label="AI chat message input"
            />
            <button
              onClick={send}
              disabled={!text.trim() || loading}
              className="btn btn-primary btn-icon"
              style={{ height: 40, width: 44, flexShrink: 0, borderRadius: 'var(--r-md)' }}
              aria-label="Send message"
            >
              <SendIcon />
            </button>
          </div>
        </div>
      )}

      {/* Floating toggle button */}
      <button
        onClick={() => setOpen(o => !o)}
        aria-label={open ? 'Close AI assistant' : 'Open AI assistant'}
        style={{
          width: 58, height: 58, borderRadius: '50%',
          background: 'linear-gradient(135deg, var(--primary), #0284C7)',
          color: 'white', border: 'none', cursor: 'pointer',
          boxShadow: '0 10px 24px rgba(0,56,168,0.3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 24, transition: 'transform 0.15s ease',
        }}
        onMouseDown={e => e.currentTarget.style.transform = 'scale(0.92)'}
        onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
      >
        {open ? '✕' : '💬'}
      </button>
    </div>
  );
}

function SendIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  );
}