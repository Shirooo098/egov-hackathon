import React from 'react';
import { CheckIcon, ChainIcon, ChevronRightIcon } from '../../shared/ui/Icons';
import { formatStatus } from '../../utils/matchStatus';

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
          <span>Pending Hospital Demo Review ({pending.length})</span>
          <span className="badge badge-warning" style={{ fontSize: 11 }}>Requires administrator review</span>
        </div>
        {pending.length === 0 ? (
          <div className="card empty-state" style={{ padding: '32px', textAlign: 'center' }}>
            <p style={{ color: 'var(--foreground-muted)' }}>No pending demo match evaluations require review.</p>
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
                  background: c.isLiveContext ? 'rgba(5, 150, 105, 0.02)' : 'white',
                }}
              >
                <div style={{ flex: '1 1 240px', minWidth: 0 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8, flexWrap: 'wrap' }}>
                    {c.isLiveContext && <span className="badge badge-success" style={{ fontSize: 10 }}>ACTIVE DEMO MATCH</span>}
                    {c.isLiveContext && (
                      <span
                        className="badge"
                        style={{
                          fontSize: 10,
                          background: match.blockchainAnchor ? 'rgba(0, 56, 168, 0.08)' : 'var(--background-alt)',
                          color: match.blockchainAnchor ? 'var(--primary)' : 'var(--foreground-muted)',
                          border: `1px solid ${match.blockchainAnchor ? 'rgba(0, 56, 168, 0.3)' : 'var(--border)'}`,
                        }}
                        title={match.blockchainAnchor ? `Simulated anchor: ${match.blockchainAnchor.txHash}` : 'No simulated anchor saved'}
                      >
                        <ChainIcon size={9} /> {match.blockchainAnchor ? 'Simulated anchor saved' : 'No simulated anchor'}
                      </span>
                    )}
                    <span className={`badge badge-${c.type === 'blood' ? 'primary' : 'success'}`}>{c.organ}</span>
                    <span className={`badge ${badges[c.urgency] || 'badge-moderate'}`}>{labels[c.urgency] || 'Moderate'}</span>
                  </div>
                  <div style={{ fontWeight: 800, fontSize: 17 }}>
                    {c.donor} <span className="sr-only">to</span><span aria-hidden="true" style={{ display: 'inline-flex', verticalAlign: 'middle' }}><ChevronRightIcon size={14} /></span> {c.recipient}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--foreground-muted)', marginTop: 4, overflowWrap: 'anywhere' }}>
                    ABO Match: <strong style={{ color: 'var(--foreground)' }}>{c.match}</strong> / Ref ID: <code>{c.id}</code>
                  </div>
                  {c.isLiveContext && (
                      <div style={{ fontSize: 12, color: 'var(--foreground-muted)', marginTop: 4, fontStyle: 'italic' }}>
                      "{match.recipient.description}"
                    </div>
                  )}
                </div>

                <div className="compat-wrap" style={{ minWidth: 170, flex: '1 1 170px' }} role="progressbar" aria-label={`Compatibility estimate for ${c.donor} and ${c.recipient}`} aria-valuemin="0" aria-valuemax="100" aria-valuenow={Math.min(Math.max(Number(c.score) || 0, 0), 100)}>
                  <div className="compat-header">
                    <span className="compat-label">Compatibility estimate</span>
                    <span className="compat-value" style={{ color: 'var(--emerald)', fontWeight: 800, fontSize: 18 }}>{c.score}%</span>
                  </div>
                  <div className="compat-track">
                    <div className="compat-fill compat-high" style={{ width: `${Math.min(c.score, 100)}%`, background: 'var(--emerald)' }} />
                  </div>
                </div>

                <div role="group" aria-label={`Actions for ${c.donor} and ${c.recipient}`} style={{ display: 'flex', gap: 8, flex: '1 1 180px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    style={{ color: 'var(--destructive)', fontWeight: 600 }}
                    onClick={() => handleRejectMatch(c.id)}
                  >
                    Decline
                  </button>
                  <button
                    type="button"
                    className="btn btn-success"
                    onClick={() => handleApproveMatch(c.id)}
                    style={{ padding: '10px 22px', fontWeight: 800 }}
                  >
                    <span aria-hidden="true" style={{ display: 'inline-flex', verticalAlign: 'middle' }}><CheckIcon /></span> Approve
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
            <span>Approved &amp; Active Demo Workflows ({active.length})</span>
            <span className="badge badge-verified" style={{ fontSize: 11 }}>Demo review completed</span>
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
                <div style={{ flex: '1 1 240px', minWidth: 0 }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6, flexWrap: 'wrap' }}>
                    <span className="badge badge-verified"><span aria-hidden="true" style={{ display: 'inline-flex', verticalAlign: 'middle' }}><CheckIcon size={11} /></span> Hospital Administrator demo review completed</span>
                    <span className="badge" style={{ background: 'var(--background-alt)', border: '1px solid var(--border)', fontSize: 10 }}>
                      Status: <strong>{formatStatus(c.status || 'approved').toUpperCase()}</strong>
                    </span>
                    {c.isLiveContext && <span className="live-ribbon">Active Demo Match</span>}
                  </div>
                  <div style={{ fontWeight: 700, fontSize: 16, overflowWrap: 'anywhere' }}>
                    {c.donor} <span className="sr-only">to</span><span aria-hidden="true" style={{ display: 'inline-flex', verticalAlign: 'middle' }}><ChevronRightIcon size={14} /></span> {c.recipient} <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--foreground-muted)' }}>({c.organ})</span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--foreground-muted)', marginTop: 3, overflowWrap: 'anywhere' }}>
                    ABO Pairing: <strong>{c.match}</strong> / Score: <strong>{c.score}%</strong>
                  </div>

                  {c.isLiveContext && (match.blockchainAnchor || (match.donorSigned && match.recipientSigned)) && (
                    <div style={{ marginTop: 12, padding: 14, borderRadius: 'var(--r-md)', background: 'rgba(5, 150, 105, 0.05)', border: '1px solid rgba(5, 150, 105, 0.3)', fontSize: 12 }}>
                      <div role="status" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6, flexWrap: 'wrap', fontWeight: 800, color: 'var(--emerald)', marginBottom: 6 }}>
                        <span><span aria-hidden="true" style={{ display: 'inline-flex', verticalAlign: 'middle' }}><CheckIcon size={12} /></span> Both demo signature actions recorded</span>
                        <span className="badge badge-success" style={{ fontSize: 9 }}>Simulated chain 13371</span>
                      </div>
                      {match.blockchainAnchor ? (
                        <div className="tx-hash" style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--foreground)', background: 'white', padding: 8, borderRadius: 'var(--r-sm)', border: '1px solid var(--border)', wordBreak: 'break-all' }}>
                          <div><strong>Simulated anchor hash:</strong> <code>{match.blockchainAnchor.txHash}</code></div>
                          <div><strong>Block Number:</strong> #{match.blockchainAnchor.blockNumber}</div>
                          <div style={{ marginTop: 4 }}>
                            <a href={match.blockchainAnchor.explorerUrl || "https://hackathon-blockchain.e.gov.ph"} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)', fontWeight: 700 }}>
                              View simulated anchor details <span aria-hidden="true" style={{ display: 'inline-flex', verticalAlign: 'middle' }}><ChevronRightIcon size={13} /></span>
                            </a>
                          </div>
                        </div>
                      ) : (
                        <div style={{ fontSize: 11, color: 'var(--foreground-muted)' }}>
                          Both citizens completed the demo signature step. The next action would simulate an anchor; it is not an immutable record.
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div role="group" aria-label={`Workflow actions for ${c.donor} and ${c.recipient}`} style={{ display: 'flex', gap: 10, flex: '1 1 220px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'flex-end' }}>
                  {c.isLiveContext ? (
                    ['agreement_finalized', 'contract_signed', 'ready_for_transplant'].includes(match.status) || (match.donorSigned && match.recipientSigned) ? (
                      match.blockchainAnchor ? (
                        <span className="badge badge-success" style={{ padding: '8px 16px', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700 }}>
                          <span aria-hidden="true" style={{ display: 'inline-flex', verticalAlign: 'middle' }}><CheckIcon size={12} /></span> Demo workflow ready for next review step
                        </span>
                      ) : (
                          <button
                            type="button"
                          className="btn btn-primary"
                          onClick={handleAnchor}
                          style={{ padding: '10px 22px', fontWeight: 800 }}
                        >
                          <ChainIcon /> Save simulated anchor
                        </button>
                      )
                    ) : (
                      <span style={{ fontSize: 12, color: 'var(--foreground-muted)', fontStyle: 'italic' }}>
                        Awaiting citizen e-signatures
                      </span>
                    )
                  ) : (
                        <span className="badge badge-success"><span aria-hidden="true" style={{ display: 'inline-flex', verticalAlign: 'middle' }}><CheckIcon size={11} /></span> Demo workflow ready</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {rejected.length > 0 && (
        <div>
          <div className="section-title" style={{ color: 'var(--foreground-muted)', fontSize: 14 }}>Declined Demo Matches ({rejected.length})</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {rejected.map(c => (
              <div key={c.id} className="card" style={{ padding: '14px 20px', background: 'var(--background-alt)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ minWidth: 0, overflowWrap: 'anywhere' }}>
                  <strong style={{ textDecoration: 'line-through' }}>{c.donor} <span className="sr-only">to</span><span aria-hidden="true" style={{ display: 'inline-flex', verticalAlign: 'middle' }}><ChevronRightIcon size={13} /></span> {c.recipient}</strong>
                  <span style={{ marginLeft: 12, fontSize: 12, color: 'var(--destructive)' }}>This demo match was marked declined. No new match search has started.</span>
                </div>
                {c.isLiveContext && (
                  <button type="button" className="btn btn-outline btn-sm" onClick={() => advanceStatus('pending_hospital_approval')}>
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
