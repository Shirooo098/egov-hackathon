import React from 'react';
import { CheckIcon, ChainIcon } from './Icons';

export function ClinicalTriageTab({
  pendingMatches,
  activeMatches,
  rejectedMatches,
  pendingCases,
  activeCases,
  rejectedCases,
  match,
  handleRejectMatch,
  handleApproveMatch,
  handleAnchor,
  advanceStatus,
  URGENCY_BADGES,
  URGENCY_LABELS,
  U_BADGE,
  U_LABEL,
}) {
  const pending = pendingMatches || pendingCases || [];
  const active = activeMatches || activeCases || [];
  const rejected = rejectedMatches || rejectedCases || [];
  const badges = URGENCY_BADGES || U_BADGE || {};
  const labels = URGENCY_LABELS || U_LABEL || {};

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      <div>
        <div className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span>Pending Medical Triage ({pending.length})</span>
          <span className="badge badge-warning" style={{ fontSize: 11 }}>Requires Clinical Governance Action</span>
        </div>
        {pending.length === 0 ? (
          <div className="card empty-state" style={{ padding: '32px', textAlign: 'center' }}>
            <p style={{ color: 'var(--foreground-muted)' }}>No pending match evaluations currently requiring triage.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {pending.map(c => (
              <div
                key={c.id}
                className="card anim-up"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 20,
                  flexWrap: 'wrap',
                  padding: '20px 24px',
                  borderLeft: c.isLiveContext ? '5px solid var(--emerald)' : undefined,
                  background: c.isLiveContext ? 'rgba(5, 150, 105, 0.02)' : 'white',
                }}
              >
                <div style={{ flex: '1 1 240px' }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                    {c.isLiveContext && <span className="badge badge-success" style={{ fontSize: 10 }}>★ ACTIVE DEMO MATCH</span>}
                    <span className={`badge badge-${c.type === 'blood' ? 'primary' : 'success'}`}>{c.organ}</span>
                    <span className={`badge ${badges[c.urgency] || 'badge-moderate'}`}>{labels[c.urgency] || 'Moderate'}</span>
                  </div>
                  <div style={{ fontWeight: 800, fontSize: 17 }}>
                    {c.donor} <span style={{ color: 'var(--foreground-subtle)', fontWeight: 400, margin: '0 4px' }}>➔</span> {c.recipient}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--foreground-muted)', marginTop: 4 }}>
                    ABO Match: <strong style={{ color: 'var(--foreground)' }}>{c.match}</strong> · Ref ID: <code>{c.id}</code>
                  </div>
                  {c.isLiveContext && (
                    <div style={{ fontSize: 12, color: 'var(--foreground-subtle)', marginTop: 4, fontStyle: 'italic' }}>
                      "{match.recipient.description}"
                    </div>
                  )}
                </div>

                <div className="compat-wrap" style={{ minWidth: 170 }}>
                  <div className="compat-header">
                    <span className="compat-label">Automated Matrix Score</span>
                    <span className="compat-value" style={{ color: 'var(--emerald)', fontWeight: 800, fontSize: 18 }}>{c.score}%</span>
                  </div>
                  <div className="compat-track">
                    <div className="compat-fill compat-high" style={{ width: `${Math.min(c.score, 100)}%`, background: 'var(--emerald)' }} />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 10, flexShrink: 0 }}>
                  <button
                    className="btn btn-ghost btn-sm"
                    style={{ color: 'var(--destructive)' }}
                    onClick={() => handleRejectMatch(c.id)}
                  >
                    Reject
                  </button>
                  <button
                    className="btn btn-success"
                    onClick={() => handleApproveMatch(c.id)}
                    style={{ padding: '8px 20px', fontWeight: 700 }}
                  >
                    <CheckIcon /> Grant Approval
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {active.length > 0 && (
        <div>
          <div className="section-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>Approved &amp; Active Procedures ({active.length})</span>
            <span className="badge badge-verified" style={{ fontSize: 11 }}>Clinical Clearance Granted</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {active.map(c => (
              <div
                key={c.id}
                className="card anim-up"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 20,
                  flexWrap: 'wrap',
                  padding: '18px 24px',
                  border: '1px solid rgba(5,150,105,0.3)',
                  background: 'rgba(5,150,105,0.015)',
                }}
              >
                <div style={{ flex: '1 1 240px' }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                    <span className="badge badge-verified">✓ Approved by PGH</span>
                    <span className="badge" style={{ background: 'var(--background-alt)', border: '1px solid var(--border)', fontSize: 10 }}>
                      Status: <strong>{c.status ? c.status.replace(/_/g, ' ').toUpperCase() : 'APPROVED'}</strong>
                    </span>
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 16 }}>
                    {c.donor} ➔ {c.recipient} <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--foreground-muted)' }}>({c.organ})</span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--foreground-muted)', marginTop: 3 }}>
                    ABO Pairing: <strong>{c.match}</strong> · Score: <strong>{c.score}%</strong>
                  </div>

                  {c.isLiveContext && (match.blockchainAnchor || (match.donorSigned && match.recipientSigned)) && (
                    <div style={{ marginTop: 12, padding: 14, borderRadius: 'var(--r-md)', background: 'rgba(5, 150, 105, 0.05)', border: '1px solid rgba(5, 150, 105, 0.3)', fontSize: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, fontWeight: 800, color: 'var(--emerald)', marginBottom: 6 }}>
                        <span>✓ Dual E-Signatures Cryptographically Verified (Donor &amp; Recipient)</span>
                        <span className="badge badge-success" style={{ fontSize: 9 }}>Chain ID: 13371 (Besu)</span>
                      </div>
                      {match.blockchainAnchor ? (
                        <div style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--foreground)', background: 'white', padding: 8, borderRadius: 'var(--r-sm)', border: '1px solid var(--border)', wordBreak: 'break-all' }}>
                          <div><strong>Besu Tx Hash:</strong> <code>{match.blockchainAnchor.txHash}</code></div>
                          <div><strong>Block Number:</strong> #{match.blockchainAnchor.blockNumber}</div>
                          <div style={{ marginTop: 4 }}>
                            <a href={match.blockchainAnchor.explorerUrl || "https://hackathon-blockchain.e.gov.ph"} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)', fontWeight: 700 }}>
                              View Zero-Knowledge Proof On-Chain Explorer ➔
                            </a>
                          </div>
                        </div>
                      ) : (
                        <div style={{ fontSize: 11, color: 'var(--foreground-muted)' }}>
                          Both citizens have affixed verified digital signatures. Ready for immutable blockchain anchoring.
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: 10, flexShrink: 0, alignItems: 'center' }}>
                  {c.isLiveContext ? (
                    ['agreement_finalized', 'contract_signed', 'ready_for_transplant'].includes(match.status) || (match.donorSigned && match.recipientSigned) ? (
                      match.blockchainAnchor ? (
                        <span className="badge badge-success" style={{ padding: '8px 16px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700 }}>
                          ✓ Besu Audited &amp; Ready for Transplant
                        </span>
                      ) : (
                        <button
                          className="btn btn-primary"
                          onClick={handleAnchor}
                          style={{ padding: '8px 18px', fontWeight: 700 }}
                        >
                          <ChainIcon /> Anchor Agreement On-Chain
                        </button>
                      )
                    ) : (
                      <span style={{ fontSize: 12, color: 'var(--foreground-subtle)', fontStyle: 'italic' }}>
                        Awaiting citizen e-signatures
                      </span>
                    )
                  ) : (
                    <span className="badge badge-success">✓ Procedure Ready</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {rejected.length > 0 && (
        <div>
          <div className="section-title" style={{ color: 'var(--foreground-muted)', fontSize: 14 }}>Declined / Returned to Registry ({rejected.length})</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {rejected.map(c => (
              <div key={c.id} className="card" style={{ padding: '14px 20px', opacity: 0.6, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <strong style={{ textDecoration: 'line-through' }}>{c.donor} ➔ {c.recipient}</strong>
                  <span style={{ marginLeft: 12, fontSize: 12, color: 'var(--destructive)' }}>Declined during clinical triage</span>
                </div>
                {c.isLiveContext && (
                  <button className="btn btn-outline btn-sm" onClick={() => advanceStatus('pending_hospital_approval')}>
                    Re-evaluate
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
