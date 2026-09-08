import './HospitalTabComponents.css';
import React from 'react';
import { CheckIcon, ChainIcon, ChevronRightIcon } from '../../components/ui/Icons';
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
    <div className="hospital-triage__1-1">
      <div>
        <div className="section-title hospital-triage__2-1">
          <span>Pending Hospital Demo Review ({pending.length})</span>
          <span className="badge badge-warning hospital-triage__1-2">Requires administrator review</span>
        </div>
        {pending.length === 0 ? (
          <div className="card empty-state hospital-triage__3-1">
            <p className="hospital-triage__2-2">No pending demo match evaluations require review.</p>
          </div>
        ) : (
          <div className="hospital-triage__4-1">
            {pending.map(c => (
              <div
                key={c.id}
                className="card anim-up hospital-triage__1-3" style={{background: c.isLiveContext ? 'rgba(5, 150, 105, 0.02)' : 'white'}}
              >
                <div className="hospital-triage__3-2">
                  <div className="hospital-triage__5-1">
                    {c.isLiveContext && <span className="badge badge-success hospital-triage__4-2">ACTIVE DEMO MATCH</span>}
                    {c.isLiveContext && (
                      <span
                        className="badge hospital-triage__2-3" style={{background: match.blockchainAnchor ? 'rgba(0, 56, 168, 0.08)' : 'var(--background-alt)', color: match.blockchainAnchor ? 'var(--primary)' : 'var(--foreground-muted)', border: `1px solid ${match.blockchainAnchor ? 'rgba(0, 56, 168, 0.3)' : 'var(--border)'}`}}
                        title={match.blockchainAnchor ? `Simulated anchor: ${match.blockchainAnchor.txHash}` : 'No simulated anchor saved'}
                      >
                        <ChainIcon size={9} /> {match.blockchainAnchor ? 'Simulated anchor saved' : 'No simulated anchor'}
                      </span>
                    )}
                    <span className={`badge badge-${c.type === 'blood' ? 'primary' : 'success'}`}>{c.organ}</span>
                    <span className={`badge ${badges[c.urgency] || 'badge-moderate'}`}>{labels[c.urgency] || 'Moderate'}</span>
                  </div>
                  <div className="hospital-triage__5-2">
                    {c.donor} <span className="sr-only">to</span><span className="hospital-triage__6-1" aria-hidden="true"><ChevronRightIcon size={14} /></span> {c.recipient}
                  </div>
                  <div className="hospital-triage__7-1">
                    ABO Match: <strong className="hospital-triage__6-2">{c.match}</strong> / Ref ID: <code>{c.id}</code>
                  </div>
                  {c.isLiveContext && (
                      <div className="hospital-triage__8-1">
                      "{match.recipient.description}"
                    </div>
                  )}
                </div>

                <div className="compat-wrap hospital-triage__9-1" role="progressbar" aria-label={`Compatibility estimate for ${c.donor} and ${c.recipient}`} aria-valuemin="0" aria-valuemax="100" aria-valuenow={Math.min(Math.max(Number(c.score) || 0, 0), 100)}>
                  <div className="compat-header">
                    <span className="compat-label">Compatibility estimate</span>
                    <span className="compat-value hospital-triage__7-2">{c.score}%</span>
                  </div>
                  <div className="compat-track">
                    <div className="compat-fill compat-high hospital-triage__3-3" style={{width: `${Math.min(c.score, 100)}%`}} />
                  </div>
                </div>

                <div className="hospital-triage__10-1" role="group" aria-label={`Actions for ${c.donor} and ${c.recipient}`}>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm hospital-triage__8-2"
                    onClick={() => handleRejectMatch(c.id)}
                  >
                    Decline
                  </button>
                  <button
                    type="button"
                    className="btn btn-success"
                    onClick={() => handleApproveMatch(c.id)}
                    className="btn btn-success hospital-triage__9-2"
                  >
                    <span className="hospital-triage__11-1" aria-hidden="true"><CheckIcon /></span> Approve
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {active.length > 0 && (
        <div>
          <div className="section-title hospital-triage__12-1">
            <span>Approved &amp; Active Demo Workflows ({active.length})</span>
            <span className="badge badge-verified hospital-triage__10-2">Demo review completed</span>
          </div>
          <div className="hospital-triage__13-1">
            {active.map(c => (
              <div
                key={c.id}
                className="card anim-up hospital-triage__4-3"
              >
                <div className="hospital-triage__11-2">
                  <div className="hospital-triage__14-1">
                    <span className="badge badge-verified"><span className="hospital-triage__15-1" aria-hidden="true"><CheckIcon size={11} /></span> Hospital Administrator demo review completed</span>
                    <span className="badge hospital-triage__16-1">
                      Status: <strong>{formatStatus(c.status || 'approved').toUpperCase()}</strong>
                    </span>
                    {c.isLiveContext && <span className="live-ribbon">Active Demo Match</span>}
                  </div>
                  <div className="hospital-triage__17-1">
                    {c.donor} <span className="sr-only">to</span><span className="hospital-triage__18-1" aria-hidden="true"><ChevronRightIcon size={14} /></span> {c.recipient} <span className="hospital-triage__19-1">({c.organ})</span>
                  </div>
                  <div className="hospital-triage__20-1">
                    ABO Pairing: <strong>{c.match}</strong> / Score: <strong>{c.score}%</strong>
                  </div>

                  {c.isLiveContext && (match.blockchainAnchor || (match.donorSigned && match.recipientSigned)) && (
                    <div className="hospital-triage__21-1">
                      <div className="hospital-triage__22-1" role="status">
                        <span><span className="hospital-triage__23-1" aria-hidden="true"><CheckIcon size={12} /></span> Both demo signature actions recorded</span>
                        <span className="badge badge-success hospital-triage__12-2">Simulated chain 13371</span>
                      </div>
                      {match.blockchainAnchor ? (
                        <div className="tx-hash hospital-triage__24-1">
                          <div><strong>Simulated anchor hash:</strong> <code>{match.blockchainAnchor.txHash}</code></div>
                          <div><strong>Block Number:</strong> #{match.blockchainAnchor.blockNumber}</div>
                          <div className="hospital-triage__13-2">
                            <a href={match.blockchainAnchor.explorerUrl || "https://hackathon-blockchain.e.gov.ph"} target="_blank" rel="noopener noreferrer" className="hospital-triage__14-2">
                              View simulated anchor details <span className="hospital-triage__25-1" aria-hidden="true"><ChevronRightIcon size={13} /></span>
                            </a>
                          </div>
                        </div>
                      ) : (
                        <div className="hospital-triage__26-1">
                          Both citizens completed the demo signature step. The next action would simulate an anchor; it is not an immutable record.
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="hospital-triage__27-1" role="group" aria-label={`Workflow actions for ${c.donor} and ${c.recipient}`}>
                  {c.isLiveContext ? (
                    ['agreement_finalized', 'contract_signed', 'ready_for_transplant'].includes(match.status) || (match.donorSigned && match.recipientSigned) ? (
                      match.blockchainAnchor ? (
                        <span className="badge badge-success hospital-triage__28-1">
                          <span className="hospital-triage__29-1" aria-hidden="true"><CheckIcon size={12} /></span> Demo workflow ready for next review step
                        </span>
                      ) : (
                          <button
                            type="button"
                          onClick={handleAnchor}
                          className="btn btn-primary hospital-triage__15-2"
                        >
                          <ChainIcon /> Save simulated anchor
                        </button>
                      )
                    ) : (
                      <span className="hospital-triage__30-1">
                        Awaiting citizen e-signatures
                      </span>
                    )
                  ) : (
                        <span className="badge badge-success"><span className="hospital-triage__31-1" aria-hidden="true"><CheckIcon size={11} /></span> Demo workflow ready</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {rejected.length > 0 && (
        <div>
          <div className="section-title hospital-triage__16-2">Declined Demo Matches ({rejected.length})</div>
          <div className="hospital-triage__32-1">
            {rejected.map(c => (
              <div key={c.id} className="card hospital-triage__33-1">
                <div className="hospital-triage__34-1">
                  <strong className="hospital-triage__17-2">{c.donor} <span className="sr-only">to</span><span className="hospital-triage__35-1" aria-hidden="true"><ChevronRightIcon size={13} /></span> {c.recipient}</strong>
                  <span className="hospital-triage__36-1">This demo match was marked declined. No new match search has started.</span>
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
