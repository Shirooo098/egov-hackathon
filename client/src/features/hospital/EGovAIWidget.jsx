import './EGovAIWidget.css';
import React, { useState } from 'react';
import { api } from '../../services/api';

const QUICK = [
  { icon: 'scale',    title: 'Organ Donation',    prompt: 'What are the laws on organ donation in the Philippines?' },
  { icon: 'drop',     title: 'Blood Donation',    prompt: 'Who can legally donate blood in the Philippines?' },
  { icon: 'gavel',    title: 'RA 7170',           prompt: 'What is Republic Act 7170?' },
  { icon: 'register', title: 'Donor Registration', prompt: 'How does the sample organ-donor registration flow work?' },
];

const SOURCES = [
  { label: 'RA 7170', sub: 'Organ Donation Act of 1991' },
  { label: 'RA 7719', sub: 'National Blood Services Act' },
  { label: 'DOH AO 2024-0023', sub: 'National Transplant Program' },
  { label: 'DOH-NTP', sub: 'Clinical Guidelines' },
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
    <div className="card egovai-widget">
      {/* Header strip — eyebrow + statute source chips */}
      <div className="egovai-widget__header">
        <div className="egovai-widget__eyebrow-row">
          <span className="egovai-widget__eyebrow">
            Philippine Health Law References · Demo assistant
          </span>
          <span className="egovai-widget__rule" aria-hidden />
          <span className="badge badge-primary egovai-widget__prototype-badge">
            Prototype assistant
          </span>
        </div>
        <h2 className="egovai-widget__title">
          Philippine Health Law Reference Console
        </h2>
        <p className="egovai-widget__intro">
          Ask about organ donation, blood transfusion, or sample DOH regulatory references.
          This prototype is informational and not legal or clinical advice.
        </p>

        {/* Source chips */}
        <div className="egovai-widget__sources">
          <span className="egovai-widget__sources-label">
            Sources
          </span>
          {SOURCES.map((s) => (
            <span
              key={s.label}
              className="badge egovai-widget__source-badge"
              title={s.sub}
            >
              {s.label}
            </span>
          ))}
        </div>
      </div>

      {/* Quick start — 2×2 topic grid */}
      <div className="egovai-widget__quick-heading">
        <span className="egovai-widget__section-label">
          Quick Start
        </span>
        <span className="egovai-widget__rule" aria-hidden />
      </div>
      <div className="laws-quick-grid">
        {QUICK.map((q) => (
          <button
            key={q.title}
            className="laws-quick-card"
            onClick={() => { setPrompt(q.prompt); ask(q.prompt); }}
            type="button"
          >
            <span className="laws-quick-icon" aria-hidden>
              <QuickIcon name={q.icon} />
            </span>
            <span className="laws-quick-body">
              <span className="laws-quick-title">{q.title}</span>
              <span className="laws-quick-prompt">{q.prompt}</span>
            </span>
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="egovai-widget__input-row">
        <textarea
          className="input egovai-widget__textarea"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Ask about organ donation laws, blood donation regulations…"
          rows={2}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) ask();
          }}
        />
        <button
          onClick={() => ask()}
          disabled={!prompt.trim() || loading}
          className="btn btn-primary egovai-widget__ask-button"
        >
          {loading ? <span className="spinner" /> : <SendIcon />}
          <span>{loading ? 'Asking…' : 'Ask'}</span>
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div className="egovai-widget__loading">
          <div className="spinner spinner-lg" />
          <p className="egovai-widget__loading-text">
            Querying the prototype law-reference service…
          </p>
        </div>
      )}

      {/* Response — editorial style */}
      {response && !loading && (
        <div
          className="laws-response egovai-widget__response"
        >
          <div className="egovai-widget__response-header">
            <span
              className="icon-badge icon-badge-navy egovai-widget__response-icon"
              aria-hidden
            >
              <ScaleIcon size={15} />
            </span>
            <div className="egovai-widget__response-copy">
              <div className="egovai-widget__response-label">
                Prototype assistant response
              </div>
              <div className="egovai-widget__response-note">
                References are sample context; not verified legal or clinical guidance
              </div>
            </div>
            {session && (
              <span className="egovai-widget__session">
                Session {session.slice(0, 8)}…
              </span>
            )}
          </div>
          <p className="egovai-widget__response-text">
            {response}
          </p>
        </div>
      )}
    </div>
  );
}

function ScaleIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="3" x2="12" y2="21" />
      <path d="M6 21L12 3L18 21" />
      <path d="M3 14h6" />
      <path d="M15 14h6" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  );
}

function QuickIcon({ name }) {
  const common = { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' };
  if (name === 'scale') {
    return (
      <svg {...common}>
        <line x1="12" y1="3" x2="12" y2="21" />
        <path d="M6 21L12 3L18 21" />
        <path d="M3 14h6" />
        <path d="M15 14h6" />
      </svg>
    );
  }
  if (name === 'drop') {
    return (
      <svg {...common}>
        <path d="M12 2.5s6 6.5 6 11a6 6 0 1 1-12 0c0-4.5 6-11 6-11z" />
      </svg>
    );
  }
  if (name === 'gavel') {
    return (
      <svg {...common}>
        <path d="M14 4l6 6" />
        <path d="M9 9l6 6" />
        <path d="M3 19l4-4" />
        <path d="M11 7l4 4" />
        <path d="M3 21h12" />
      </svg>
    );
  }
  // register
  return (
    <svg {...common}>
      <path d="M4 4h12a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H4z" />
      <line x1="8" y1="9" x2="14" y2="9" />
      <line x1="8" y1="13" x2="14" y2="13" />
      <line x1="8" y1="17" x2="11" y2="17" />
    </svg>
  );
}
