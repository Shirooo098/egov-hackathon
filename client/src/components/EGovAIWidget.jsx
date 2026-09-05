import React, { useState } from 'react';
import { api } from '../services/api';

const QUICK = [
  { icon: 'scale',    title: 'Organ Donation',    prompt: 'What are the laws on organ donation in the Philippines?' },
  { icon: 'drop',     title: 'Blood Donation',    prompt: 'Who can legally donate blood in the Philippines?' },
  { icon: 'gavel',    title: 'RA 7170',           prompt: 'What is Republic Act 7170?' },
  { icon: 'register', title: 'Donor Registration', prompt: 'How do I register as an official organ donor?' },
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
    <div className="card" style={{ overflow: 'hidden' }}>
      {/* Header strip — eyebrow + statute source chips */}
      <div style={{ paddingBottom: 16, borderBottom: '1px solid var(--border)', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
          <span
            style={{
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: 'var(--primary)',
              fontFamily: 'var(--font-heading)',
            }}
          >
            Philippine Health Laws · eGovAI Assistant
          </span>
          <span
            aria-hidden
            style={{
              flex: 1,
              height: 1,
              background: 'var(--border)',
              minWidth: 12,
            }}
          />
          <span className="badge badge-primary" style={{ fontSize: 10 }}>
            DICT eGovAI
          </span>
        </div>
        <h2
          style={{
            fontFamily: 'var(--font-heading)',
            fontSize: 'clamp(22px, 4vw, 28px)',
            fontWeight: 600,
            letterSpacing: '-0.02em',
            color: 'var(--foreground)',
            margin: 0,
            lineHeight: 1.15,
          }}
        >
          Philippine Health Law Reference Console
        </h2>
        <p
          style={{
            fontSize: 14,
            color: 'var(--foreground-muted)',
            margin: '8px 0 0',
            lineHeight: 1.55,
            maxWidth: 640,
          }}
        >
          Ask about organ donation, blood transfusion, or DOH regulatory guidance.
          Backed by official statutes and DOH clinical guidelines.
        </p>

        {/* Source chips */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginTop: 14,
            flexWrap: 'wrap',
          }}
        >
          <span
            style={{
              fontSize: 10,
              fontWeight: 800,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'var(--foreground-subtle)',
              marginRight: 4,
            }}
          >
            Sources
          </span>
          {SOURCES.map((s) => (
            <span
              key={s.label}
              className="badge"
              title={s.sub}
              style={{
                fontSize: 11,
                padding: '4px 10px',
                background: 'var(--background-alt)',
                border: '1px solid var(--border)',
                color: 'var(--foreground)',
                fontWeight: 600,
              }}
            >
              {s.label}
            </span>
          ))}
        </div>
      </div>

      {/* Quick start — 2×2 topic grid */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          marginBottom: 12,
        }}
      >
        <span
          style={{
            fontSize: 10,
            fontWeight: 800,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'var(--foreground-subtle)',
          }}
        >
          Quick Start
        </span>
        <span aria-hidden style={{ flex: 1, height: 1, background: 'var(--border)' }} />
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
      <div style={{ display: 'flex', gap: 10, marginTop: 18 }}>
        <textarea
          className="input"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Ask about organ donation laws, blood donation regulations…"
          rows={2}
          style={{ flex: 1, fontSize: 14 }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) ask();
          }}
        />
        <button
          onClick={() => ask()}
          disabled={!prompt.trim() || loading}
          className="btn btn-primary"
          style={{
            alignSelf: 'flex-end',
            height: 44,
            padding: '0 18px',
            fontWeight: 700,
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            whiteSpace: 'nowrap',
          }}
        >
          {loading ? <span className="spinner" /> : <SendIcon />}
          <span>{loading ? 'Asking…' : 'Ask'}</span>
        </button>
      </div>

      {/* Loading */}
      {loading && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 12,
            padding: '24px 0',
          }}
        >
          <div className="spinner spinner-lg" />
          <p style={{ fontSize: 13, color: 'var(--foreground-muted)' }}>
            Querying DICT eGovAI Laws &amp; Regulations API…
          </p>
        </div>
      )}

      {/* Response — editorial style */}
      {response && !loading && (
        <div
          className="laws-response"
          style={{
            marginTop: 18,
            background: 'var(--background-alt)',
            border: '1px solid var(--border)',
            borderLeft: '3px solid var(--primary)',
            borderRadius: 'var(--r-lg)',
            padding: '18px 20px',
            animation: 'fadeIn 0.3s ease',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              marginBottom: 10,
              paddingBottom: 10,
              borderBottom: '1px dashed var(--border)',
              flexWrap: 'wrap',
            }}
          >
            <span
              className="icon-badge icon-badge-navy"
              style={{ width: 28, height: 28 }}
              aria-hidden
            >
              <ScaleIcon size={15} />
            </span>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 800,
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  color: 'var(--primary)',
                }}
              >
                eGovAI Response
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: 'var(--foreground-subtle)',
                  marginTop: 2,
                }}
              >
                Verified against RA 7170, RA 7719 &amp; DOH clinical guidelines
              </div>
            </div>
            {session && (
              <span
                style={{
                  fontSize: 10,
                  color: 'var(--foreground-subtle)',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                Session {session.slice(0, 8)}…
              </span>
            )}
          </div>
          <p
            style={{
              fontSize: 14,
              lineHeight: 1.75,
              color: 'var(--foreground)',
              margin: 0,
            }}
          >
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
