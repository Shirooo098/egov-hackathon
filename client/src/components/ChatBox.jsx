import React, { useState, useRef, useEffect } from 'react';
import { useToast } from '../context/ToastContext';

const DEMO_MESSAGES = [
  { id: 1, sender: 'donor',     text: 'Good day! I have reviewed and completed my e-signature on our DOH clinical donation agreement.', time: '10:30 AM' },
  { id: 2, sender: 'recipient', text: 'Thank you so much! I have also signed the government document. This means everything to me and my family.', time: '10:32 AM' },
  { id: 3, sender: 'donor',     text: 'I will see you at Philippine General Hospital (PGH) on our confirmed procedure schedule!', time: '10:33 AM' },
];

export default function ChatBox({ currentRole = 'recipient', consentSigned = false, doctorApproved = false }) {
  const [messages, setMessages] = useState(DEMO_MESSAGES);
  const [text, setText] = useState('');
  const endRef = useRef();
  const toast = useToast();

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const send = () => {
    if (!text.trim() || !doctorApproved) return;
    const newText = text.trim();
    setMessages(p => [...p, { id: Date.now(), sender: currentRole, text: newText, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
    setText('');

    // Demonstrate SMS alert dispatch without blocking conversational interaction (Issue #010)
    setTimeout(() => {
      toast.info(
        `📱 DICT eMessage SMS Push sent to ${other}: "You have received a new secure verified direct message regarding your DOH transplant procedure."`,
        { title: 'eMessage Reactive SMS Push', duration: 6000 }
      );
    }, 200);
  };

  // Reaching agreement submission removes all legacy anonymous name masking (Issue #010)
  const other = consentSigned
    ? (currentRole === 'donor' ? 'Ana Reyes' : 'Juan Dela Cruz')
    : (currentRole === 'donor' ? 'Anonymous Recipient #9C41' : 'Anonymous Donor #7C2A');

  // STRICT LOCK SCREEN: Prohibit chat unless approved by institutional clinical review
  if (!doctorApproved) {
    return (
      <div className="card anim-in" style={{ padding: 40, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 460, gap: 16, background: 'white' }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(245,158,11,0.1)', color: 'var(--sun)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32 }}>
          🔒
        </div>
        <div>
          <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 8 }}>Messaging Restricted (Clinical Approval & Agreement Required)</h3>
          <p style={{ fontSize: 13, color: 'var(--foreground-muted)', maxWidth: 460, lineHeight: 1.6 }}>
            Direct recipient-donor communication is restricted under National Organ Transplantation Regulations until an attending medical specialist reviews compatibility, grants match clearance, and consultation scheduling is initiated.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center', background: 'var(--background-alt)', padding: '10px 18px', borderRadius: 'var(--r-full)', border: '1px solid var(--border)', fontSize: 12 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--sun)' }} />
          <span style={{ fontWeight: 700 }}>Current Governance Status:</span>
          <span style={{ color: 'var(--sun)', fontWeight: 600 }}>Awaiting Clinical Clearance ⏳</span>
        </div>
      </div>
    );
  }

  // ACTIVE UNLOCKED CHAT ROOM
  return (
    <div className="card anim-in" style={{ padding: 0, display: 'flex', flexDirection: 'column', height: 520, overflow: 'hidden', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', boxShadow: 'var(--shadow-sm)' }}>
      {/* Header */}
      <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', background: 'var(--background-alt)', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary), #0284C7)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-heading)', fontWeight: 800, color: 'white', fontSize: 16 }}>
          {other.charAt(0)}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 800, fontSize: 15, display: 'flex', alignItems: 'center', gap: 6 }}>
            {other}
            {!consentSigned && (
              <span className="badge badge-warning" style={{ fontSize: 10 }}>Masked ID (Complete Agreement to Unmask)</span>
            )}
          </div>
          <div style={{ fontSize: 11, color: 'var(--emerald)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 5, marginTop: 2 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--emerald)', display: 'inline-block' }} />
            Online · {consentSigned ? 'Verified Tier I PhilSys Citizen ✓' : 'PGH Approved Clinical Partner'}
          </div>
        </div>
        {consentSigned ? (
          <span className="badge badge-verified" style={{ padding: '6px 12px', fontSize: 11 }}>PhilSys Unmasked ID ✓</span>
        ) : (
          <span className="badge" style={{ fontSize: 11, background: 'rgba(0,0,0,0.05)' }}>Anonymous Communication</span>
        )}
      </div>

      {/* Messages */}
      <div
        role="log"
        aria-live="polite"
        aria-label="Chat messages"
        style={{ flex: 1, overflow: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: 12, background: 'white' }}
      >
        {messages.map(m => {
          const self = m.sender === currentRole;
          return (
            <div key={m.id} style={{ display: 'flex', flexDirection: 'column', alignItems: self ? 'flex-end' : 'flex-start', gap: 4, animation: 'fadeIn 0.2s ease' }}>
              <div className={`bubble ${self ? 'bubble-sent' : 'bubble-recv'}`} aria-label={self ? 'You' : other} style={{ maxWidth: '80%', padding: '10px 14px', fontSize: 13, lineHeight: 1.5 }}>
                {m.text}
              </div>
              <span style={{ fontSize: 11, color: 'var(--foreground-subtle)', paddingInline: 4, fontWeight: 500 }}>{m.time}</span>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      {/* Input */}
      <div style={{ padding: '14px 18px', borderTop: '1px solid var(--border)', background: 'var(--background-alt)', display: 'flex', gap: 10, alignItems: 'flex-end' }}>
        <textarea
          className="input"
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
          placeholder="Type a verified clinical communication message… (Enter to send)"
          rows={1}
          style={{ resize: 'none', lineHeight: 1.5, minHeight: 44, flex: 1, fontSize: 13 }}
          aria-label="Message input"
        />
        <button onClick={send} disabled={!text.trim()} className="btn btn-primary btn-icon" style={{ height: 44, width: 48, flexShrink: 0, borderRadius: 'var(--r-md)' }} aria-label="Send message">
          <SendIcon />
        </button>
      </div>
    </div>
  );
}

function SendIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>; }
