import React, { useState, useRef, useEffect } from 'react';

const DEMO = [
  { id:1, sender:'donor',     text:'Hi! I saw I am a match for your blood type. I am happy to donate!',              time:'10:30 AM' },
  { id:2, sender:'recipient', text:'Thank you so much! This means everything to me and my family.',                    time:'10:32 AM' },
  { id:3, sender:'donor',     text:'I can go this week. Let me know your schedule once confirmed by attending doctor!', time:'10:33 AM' },
];

export default function ChatBox({ currentRole = 'recipient', consentSigned, doctorApproved = false }) {
  const [messages, setMessages] = useState(DEMO);
  const [text, setText] = useState('');
  const [approvedByDoctor, setApprovedByDoctor] = useState(doctorApproved);
  const endRef = useRef();

  useEffect(() => { setApprovedByDoctor(doctorApproved); }, [doctorApproved]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior:'smooth' }); }, [messages]);

  const send = () => {
    if (!text.trim() || !approvedByDoctor) return;
    setMessages(p => [...p, { id:Date.now(), sender:currentRole, text:text.trim(), time:new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}) }]);
    setText('');
  };

  const other = consentSigned
    ? (currentRole === 'donor' ? 'Ana Reyes' : 'Juan Dela Cruz')
    : (currentRole === 'donor' ? 'Anonymous Recipient #9C41' : 'Anonymous Donor #7C2A');
  const role  = currentRole === 'donor' ? 'Recipient' : 'Donor';

  // STRICT LOCK SCREEN: Prohibit chat unless approved by doctor
  if (!approvedByDoctor) {
    return (
      <div className="card anim-in" style={{ padding: 40, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 460, gap: 16, background: 'white' }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'rgba(245,158,11,0.1)', color: 'var(--sun)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32 }}>
          🔒
        </div>
        <div>
          <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 8 }}>Messaging Prohibited (Doctor Approval Required)</h3>
          <p style={{ fontSize: 13, color: 'var(--foreground-muted)', maxWidth: 440, lineHeight: 1.6 }}>
            Direct recipient-donor communication is strictly restricted under National Organ Transplantation Regulations until an attending physician reviews clinical compatibility and issues official match clearance.
          </p>
        </div>

        <div style={{ display: 'flex', gap: 8, alignItems: 'center', background: 'var(--background-alt)', padding: '10px 16px', borderRadius: 'var(--r-full)', border: '1px solid var(--border)', fontSize: 12 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--sun)' }} />
          <span style={{ fontWeight: 700 }}>Current Match Status:</span>
          <span style={{ color: 'var(--sun)', fontWeight: 600 }}>Pending Doctor Clinical Review ⏳</span>
        </div>

        <button 
          type="button" 
          className="btn btn-primary" 
          onClick={() => setApprovedByDoctor(true)}
          style={{ marginTop: 8 }}
        >
          Grant Doctor Match Approval (Demo Control) ✓
        </button>
      </div>
    );
  }

  // ACTIVE UNLOCKED CHAT ROOM
  return (
    <div className="card anim-in" style={{ padding:0, display:'flex', flexDirection:'column', height:500, overflow:'hidden' }}>
      {/* Header */}
      <div style={{ padding:'14px 20px', borderBottom:'1px solid var(--border)', background:'var(--background-alt)', display:'flex', alignItems:'center', gap:12 }}>
        <div style={{ width:38,height:38,borderRadius:'50%', background:'linear-gradient(135deg, var(--primary), #0284C7)', display:'flex',alignItems:'center',justifyContent:'center', fontFamily:'var(--font-heading)',fontWeight:800,color:'white',fontSize:15 }}>
          {other.charAt(0)}
        </div>
        <div style={{ flex:1 }}>
          <div style={{ fontWeight:700, fontSize:14 }}>{other}</div>
          <div style={{ fontSize:11, color: 'var(--emerald)', fontWeight:600, display:'flex', alignItems:'center', gap:4 }}>
            <span style={{ width:6,height:6,borderRadius:'50%',background: 'var(--emerald)',display:'inline-block' }} />
            Online · Doctor Approved Match ✓
          </div>
        </div>
        <span className="badge badge-verified">PhilSys ✓</span>
      </div>

      {/* Messages */}
      <div style={{ flex:1, overflow:'auto', padding:'16px 20px', display:'flex', flexDirection:'column', gap:10, background:'white' }}>
        {messages.map(m => {
          const self = m.sender === currentRole;
          return (
            <div key={m.id} style={{ display:'flex', flexDirection:'column', alignItems: self ? 'flex-end' : 'flex-start', gap:3, animation:'fadeIn 0.2s ease' }}>
              <div className={`bubble ${self ? 'bubble-sent' : 'bubble-recv'}`}>{m.text}</div>
              <span style={{ fontSize:10, color:'var(--foreground-subtle)', paddingInline:4 }}>{m.time}</span>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      {/* Input */}
      <div style={{ padding:'12px 16px', borderTop:'1px solid var(--border)', background:'var(--background-alt)', display:'flex', gap:8, alignItems:'flex-end' }}>
        <textarea 
          className="input" 
          value={text} 
          onChange={e => setText(e.target.value)} 
          onKeyDown={e => { if (e.key==='Enter'&&!e.shiftKey){ e.preventDefault(); send(); }}} 
          placeholder="Type a message… (Enter to send)" 
          rows={1} 
          style={{ resize:'none',lineHeight:1.5,minHeight:40,flex:1 }} 
        />
        <button onClick={send} disabled={!text.trim()} className="btn btn-primary btn-icon" style={{ height:40, width:44, flexShrink:0 }}>
          <SendIcon />
        </button>
      </div>
    </div>
  );
}

function SendIcon() { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>; }
