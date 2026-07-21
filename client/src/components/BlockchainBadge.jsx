import React, { useState } from 'react';
import { api } from '../services/api';

export default function BlockchainBadge({ matchId, donorId, recipientId }) {
  const [donorSigned,     setDonorSigned]     = useState(false);
  const [recipientSigned, setRecipientSigned] = useState(false);
  const [status, setStatus] = useState('idle');
  const [anchor, setAnchor] = useState(null);

  const anchorChain = async () => {
    setStatus('anchoring');
    try {
      const r = await api.anchorConsent({ matchId: matchId || 'demo-match-001', donorId, recipientId, donorSignature: 'sig_d_' + Date.now(), recipientSignature: 'sig_r_' + Date.now() });
      setAnchor(r.data); setStatus('anchored');
    } catch { setStatus('error'); }
  };

  if (status === 'anchored' && anchor) return (
    <div className="card" style={{ border: '1px solid rgba(5,150,105,0.25)', background: 'rgba(5,150,105,0.03)' }}>
      <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:20 }}>
        <div className="icon-badge icon-badge-lg icon-badge-success"><ChainIcon /></div>
        <div>
          <div style={{ fontWeight:700, fontSize:15, color:'var(--emerald)' }}>Consent Anchored On-Chain</div>
          <div style={{ fontSize:12, color:'var(--foreground-muted)', marginTop:2 }}>Hyperledger Besu Â· Chain ID {anchor.chainId}</div>
        </div>
        <span className="badge badge-verified" style={{ marginLeft:'auto' }}>Confirmed</span>
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
        <div className="chain-tag"><span style={{color:'var(--foreground-subtle)',whiteSpace:'nowrap'}}>TX Hash</span><span className="tx">{anchor.txHash}</span></div>
        <div style={{ display:'flex', gap:16, fontSize:12 }}>
          <span style={{color:'var(--foreground-muted)'}}>Block <strong style={{color:'var(--foreground)'}}>#{anchor.blockNumber}</strong></span>
          {anchor.demo && <span className="badge badge-moderate">Demo</span>}
        </div>
        <a href={anchor.explorerUrl} target="_blank" rel="noopener noreferrer" className="btn btn-outline btn-sm btn-full" style={{marginTop:4}}>
          <ExternalIcon /> View on Besu Explorer
        </a>
      </div>
    </div>
  );

  return (
    <div className="card">
      <div style={{ display:'flex', alignItems:'center', gap:14, marginBottom:22 }}>
        <div className="icon-badge icon-badge-lg icon-badge-navy"><ChainIcon /></div>
        <div>
          <div style={{ fontWeight:700, fontSize:15 }}>E-Signature Consent Agreement</div>
          <div style={{ fontSize:12, color:'var(--foreground-muted)', marginTop:2 }}>Both parties must sign to anchor on Hyperledger Besu</div>
        </div>
      </div>

      <div className="grid-2" style={{ marginBottom:16 }}>
        {[
          { role:'donor',     label:'Donor Signature',    signed:donorSigned,     onSign:() => setDonorSigned(true)    },
          { role:'recipient', label:'Recipient Signature', signed:recipientSigned, onSign:() => setRecipientSigned(true) },
        ].map(({ role, label, signed, onSign }) => (
          <div key={role} className={`sig-slot${signed ? ' signed' : ''}`}>
            <div style={{ width:40,height:40,borderRadius:10,background:signed?'rgba(5,150,105,0.1)':'var(--background-alt)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 12px',border:`1px solid ${signed?'rgba(5,150,105,0.3)':'var(--border)'}` }}>
              {signed ? <CheckIcon color="var(--emerald)" /> : <PenIcon />}
            </div>
            <div style={{ fontWeight:600, fontSize:13, marginBottom:10 }}>{label}</div>
            {signed
              ? <div style={{ fontSize:12, color:'var(--emerald)', fontWeight:600 }}>âœ“ Signed</div>
              : <button className="btn btn-ghost btn-sm btn-full" onClick={onSign}>Sign Now</button>
            }
          </div>
        ))}
      </div>

      <button className="btn btn-primary btn-full btn-lg" disabled={!donorSigned || !recipientSigned || status === 'anchoring'} onClick={anchorChain}>
        {status === 'anchoring' ? <><span className="spinner" /> Anchoringâ€¦</> : <><ChainIcon /> Anchor Consent to Blockchain</>}
      </button>
      {status === 'error' && <p style={{textAlign:'center',color:'var(--destructive)',fontSize:12,marginTop:10}}>Anchoring failed. Please try again.</p>}
    </div>
  );
}

function ChainIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>; }
function CheckIcon({ color='currentColor' }) { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>; }
function PenIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--foreground-subtle)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>; }
function ExternalIcon() { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>; }
