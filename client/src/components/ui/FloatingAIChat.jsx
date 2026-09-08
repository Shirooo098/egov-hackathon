import React, { useState, useRef, useEffect } from 'react';
import { egovApi } from '../../services/egovApi';

const GREETING = {
  id: 'greeting',
  sender: 'ai',
  text: "Hi! I'm the eBuhay prototype assistant. Ask about sample Philippine government-service references, organ/blood donation information, or how this demo works. I cannot provide legal or clinical advice.",
  time: '',
};

export default function FloatingAIChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([GREETING]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const endRef = useRef();
  const launcherRef = useRef(null);
  const inputRef = useRef(null);
  const closeChat = () => {
    setOpen(false);
    launcherRef.current?.focus();
  };

  useEffect(() => {
    if (!open) return undefined;
    inputRef.current?.focus();
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeChat();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open]);

  useEffect(() => {
    if (open) endRef.current?.scrollIntoView?.({ behavior: 'smooth' });
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
    } catch {
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
    <div className="floating-ai-root">
      {open && (
        <div id="floating-ai-panel" className="floating-ai-panel card anim-in" role="dialog" aria-modal="false" aria-labelledby="floating-ai-chat-title">
          {/* Header */}
          <div className="floating-ai-header">
            <div className="floating-ai-avatar">
              e
            </div>
            <div className="floating-ai-title-wrap">
              <h2 id="floating-ai-chat-title" className="floating-ai-title">Prototype assistant</h2>
              <div className="floating-ai-status">
                <span className="floating-ai-status-dot" />
                Demo service
              </div>
            </div>
            <button
              onClick={closeChat}
              aria-label="Close chat"
              className="btn btn-ghost btn-icon floating-ai-close"
            >
              ✕
            </button>
          </div>

          {/* Messages */}
          <div
            role="log"
            aria-live="polite"
            aria-label="AI chat messages"
            className="floating-ai-messages"
          >
            {messages.map(m => {
              const self = m.sender === 'user';
              return (
                <div key={m.id} className={`floating-ai-message ${self ? 'floating-ai-message-self' : ''}`}>
                  <div className={`bubble ${self ? 'bubble-sent' : 'bubble-recv'} floating-ai-bubble`}>
                    {m.text}
                  </div>
                  {m.time && <span className="floating-ai-time">{m.time}</span>}
                </div>
              );
            })}
            {loading && (
              <div className="floating-ai-thinking">
                <div className="bubble bubble-recv">
                  <span className="spinner floating-ai-spinner" />
                  Thinking…
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          {/* Input */}
          <div className="floating-ai-input">
            <textarea
              ref={inputRef}
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder="Ask about eGov services…"
              rows={1}
              disabled={loading}
              className="input floating-ai-textarea"
              aria-label="AI chat message input"
            />
            <button
              onClick={send}
              disabled={!text.trim() || loading}
              className="btn btn-primary btn-icon floating-ai-send"
              aria-label="Send message"
            >
              <SendIcon />
            </button>
          </div>
        </div>
      )}

      {/* Floating toggle button */}
      <button
        ref={launcherRef}
        onClick={() => setOpen(o => !o)}
        aria-label={open ? 'Close AI assistant' : 'Open AI assistant'}
        aria-expanded={open}
        aria-controls="floating-ai-panel"
        aria-haspopup="dialog"
        className="floating-ai-launcher"
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
