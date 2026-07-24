import React, { useState } from 'react';
import { api } from '../services/api';

const QUICK = [
  'What are the laws on organ donation in the Philippines?',
  'Who can legally donate blood in the Philippines?',
  'What is Republic Act 7170?',
  'How do I register as an official organ donor?',
];

export default function EGovAIWidget() {
  const [prompt,   setPrompt]   = useState('');
  const [loading,  setLoading]  = useState(false);
  const [response, setResponse] = useState(null);
  const [session,  setSession]  = useState(null);

  const ask = async (q) => {
    const q_ = (q || prompt).trim();
    if (!q_) return;
    setLoading(true); setResponse(null);
    try { const r = await api.askLaws(q_); setResponse(r.data?.data || r.data); setSession(r.data?.session_id); }
    catch (e) { setResponse(`Error: ${e.message}`); }
    finally { setLoading(false); }
  };

  return (
    <div className="card">
      {/* Header — mimics API catalog card style */}
      <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:22 }}>
        <div className="icon-badge icon-badge-lg icon-badge-navy"><ScaleIcon /></div>
        <div>
          <div style={{ fontWeight:700, fontSize:15 }}>PH Health Laws Assistant</div>
          <div style={{ fontSize:12, color:'var(--foreground-muted)', marginTop:2 }}>Powered by DICT eGovAI · Laws &amp; Regulations API</div>
        </div>
        <span className="badge badge-primary" style={{ marginLeft:'auto' }}>eGovAI</span>
      </div>

      {/* Quick questions — pill chips like the site's tag-style */}
      <div className="section-title">Quick Questions</div>
      <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginBottom:20 }}>
        {QUICK.map(q => (
          <button key={q} className="btn btn-ghost btn-sm" style={{ height:'auto', textAlign:'left', whiteSpace:'normal', lineHeight:1.5, padding:'7px 12px' }} onClick={() => { setPrompt(q); ask(q); }}>
            {q}
          </button>
        ))}
      </div>

      {/* Input */}
      <div style={{ display:'flex', gap:10, marginBottom:16 }}>
        <textarea className="input" value={prompt} onChange={e => setPrompt(e.target.value)} placeholder="Ask about organ donation laws, blood donation regulations…" rows={2} style={{ flex:1 }} />
        <button onClick={() => ask()} disabled={!prompt.trim() || loading} className="btn btn-primary" style={{ alignSelf:'flex-end', height:40, padding:'0 18px' }}>
          {loading ? <span className="spinner" /> : <SendIcon />}
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:12, padding:'24px 0' }}>
          <div className="spinner spinner-lg" />
          <p style={{ fontSize:13, color:'var(--foreground-muted)' }}>Querying DICT eGovAI…</p>
        </div>
      )}

      {/* Response — styled like the feature docs panel on the site */}
      {response && !loading && (
        <div style={{ background:'var(--background-alt)', border:'1px solid var(--border)', borderRadius:'var(--r-lg)', padding:'18px 20px', borderLeft:'3px solid var(--primary)', animation:'fadeIn 0.3s ease' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12 }}>
            <div className="icon-badge" style={{ width:24,height:24 }}><ScaleIcon /></div>
            <span style={{ fontSize:11, fontWeight:700, color:'var(--primary)', textTransform:'uppercase', letterSpacing:'0.07em' }}>eGovAI Response</span>
          </div>
          <p style={{ fontSize:14, lineHeight:1.75, color:'var(--foreground-muted)' }}>{response}</p>
          {session && <div style={{ marginTop:14, fontSize:10, color:'var(--foreground-subtle)', fontFamily:'var(--font-mono)' }}>Session: {session}</div>}
        </div>
      )}
    </div>
  );
}

function ScaleIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="3" x2="12" y2="21"/><path d="M6 21L12 3L18 21"/><path d="M3 14h6"/><path d="M15 14h6"/></svg>; }
function SendIcon()  { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>; }
