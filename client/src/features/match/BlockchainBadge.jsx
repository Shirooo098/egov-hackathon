import "../../styles/components/match/BlockchainBadge.css";
import React, { useState } from "react";
import { api } from "../../services/api";
import SignatureUploader from "./SignatureUploader";

export default function BlockchainBadge({
  matchId,
  donorId,
  recipientId,
  signerRole = "recipient",
  consentSigned,
  onConsentSuccess,
}) {
  const [donorSigned, setDonorSigned] = useState(
    consentSigned || signerRole === "recipient",
  );
  const [recipientSigned, setRecipientSigned] = useState(
    consentSigned || signerRole === "donor",
  );
  const [status, setStatus] = useState(consentSigned ? "anchored" : "idle");
  const [anchor, setAnchor] = useState(
    consentSigned
      ? {
          chainId: 13371,
          txHash: "0x7c2a4b825dc642cb6eb9a060e54bf8d69288fbee4904",
          blockNumber: 4821,
          explorerUrl: "https://hackathon-blockchain.e.gov.ph",
          demo: true,
        }
      : null,
  );

  const anchorChain = async () => {
    setStatus("anchoring");
    try {
      const r = await api.anchorConsent({
        matchId: matchId || "demo-match-001",
        donorId,
        recipientId,
        donorSignature: "sig_d_" + Date.now(),
        recipientSignature: "sig_r_" + Date.now(),
      });
      setAnchor(r.data);
      setStatus("anchored");
      if (onConsentSuccess) onConsentSuccess();
    } catch {
      setAnchor(null);
      setStatus("error");
    }
  };

  if (status === "anchored" && anchor)
    return (
      <div className="card blockchain-badge-card blockchain-badge-card--anchored">
        <div className="blockchain-badge-row">
          <div className="icon-badge icon-badge-lg icon-badge-success">
            <ChainIcon />
          </div>
          <div>
            <div className="blockchain-badge-title">
              Demo consent record saved
            </div>
            <div className="blockchain-badge-meta">
              Simulated blockchain anchor · Demo ID {anchor.chainId}
            </div>
          </div>
          <span className="badge badge-verified blockchain-badge-record">
            Demo record
          </span>
        </div>
        <div className="blockchain-badge-details">
          <div className="chain-tag">
            <span className="chain-tag-label">Demo hash</span>
            <span className="tx">{anchor.txHash}</span>
          </div>
          <div className="blockchain-badge-row blockchain-badge-row--record">
            <span className="record-label">
              Record{" "}
              <strong className="record-number">#{anchor.blockNumber}</strong>
            </span>
            {anchor.demo && (
              <span className="badge badge-moderate">Simulated</span>
            )}
          </div>
          <a
            href={anchor.explorerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-outline btn-sm btn-full blockchain-explorer-link"
          >
            <ExternalIcon /> View demo anchor details
          </a>
        </div>
      </div>
    );

  return (
    <div className="card">
      <div className="blockchain-badge-row">
        <div className="icon-badge icon-badge-lg icon-badge-navy">
          <ChainIcon />
        </div>
        <div>
          <div className="blockchain-badge-title">
            E-Signature Consent Agreement
          </div>
          <div className="blockchain-badge-description">
            Both parties can add signatures for this prototype workflow; uploads
            are not identity verification.
          </div>
        </div>
      </div>

      <div className="blockchain-badge-signatures">
        {[
          {
            role: "donor",
            label: "Donor Signature Document",
            signed: donorSigned,
            onSign: () => setDonorSigned(true),
            onClear: () => setDonorSigned(false),
          },
          {
            role: "recipient",
            label: "Recipient Signature Document",
            signed: recipientSigned,
            onSign: () => setRecipientSigned(true),
            onClear: () => setRecipientSigned(false),
          },
        ].map(({ role, label, signed, onSign, onClear }) => (
          <div
            key={role}
            className={`blockchain-badge-signature-slot sig-slot-flat${signed ? " signed" : ""}`}
            style={{ background: signed ? "rgba(5,150,105,0.01)" : "white" }}
          >
            <div className="blockchain-badge-row blockchain-badge-row--signature">
              <div className="blockchain-badge-meta">{label}</div>
              {signed && (
                <span className="badge badge-success blockchain-badge-signed">
                  ✓ Signed
                </span>
              )}
            </div>
            {signed ? (
              <div className="blockchain-badge-file">
                <span className="blockchain-badge-file-icon">✍️</span>
                <span className="blockchain-badge-file-name">
                  signature_consent_secured.png
                </span>
                {((role === "donor" && signerRole === "donor") ||
                  (role === "recipient" && signerRole === "recipient")) && (
                  <button
                    className="blockchain-badge-remove"
                    type="button"
                    onClick={onClear}
                  >
                    Remove
                  </button>
                )}
              </div>
            ) : (
              <SignatureUploader onUploadComplete={onSign} onClear={onClear} />
            )}
          </div>
        ))}
      </div>

      <button
        className="btn btn-primary btn-full btn-lg"
        disabled={!donorSigned || !recipientSigned || status === "anchoring"}
        onClick={anchorChain}
      >
        {status === "anchoring" ? (
          <>
            <span className="spinner" /> Saving demo anchor…
          </>
        ) : (
          <>
            <ChainIcon />{" "}
            {status === "error" ? "Retry demo anchor" : "Save simulated anchor"}
          </>
        )}
      </button>
      {status === "error" && (
        <p className="blockchain-badge-error" role="status" aria-live="polite">
          The demo anchor could not be saved. Check your connection and try
          again.
        </p>
      )}
    </div>
  );
}

function ChainIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
    </svg>
  );
}
function CheckIcon({ color = "currentColor" }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
function PenIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="var(--foreground-subtle)"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
    </svg>
  );
}
function ExternalIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );
}
