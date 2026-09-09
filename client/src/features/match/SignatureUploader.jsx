import "../../styles/components/match/SignatureUploader.css";
import React, { useState, useRef, useEffect } from "react";

export default function SignatureUploader({
  onUploadComplete,
  onClear,
  title = "Upload E-Signature",
  subtitle = "Supports PNG, JPG, or PDF (max 5MB)",
  uploadingLabel = "Uploading signature document...",
  statusLabel = "e-signed",
  variant = "signature", // 'signature' | 'medical'
}) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef(null);
  const intervalRef = useRef(null);
  const uploadTokenRef = useRef(0);

  useEffect(
    () => () => {
      uploadTokenRef.current += 1;
      clearInterval(intervalRef.current);
    },
    [],
  );

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    clearInterval(intervalRef.current);
    const uploadToken = ++uploadTokenRef.current;
    setUploading(true);
    setProgress(0);
    setFile(null);

    // Simulate progress bar over 1 second
    let currentProgress = 0;
    intervalRef.current = setInterval(() => {
      if (uploadToken !== uploadTokenRef.current) return;
      currentProgress += 20;
      setProgress(currentProgress);
      if (currentProgress >= 100) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
        setUploading(false);
        setFile(selectedFile);
        if (onUploadComplete) onUploadComplete(selectedFile);
      }
    }, 150);
  };

  const handleClear = () => {
    uploadTokenRef.current += 1;
    clearInterval(intervalRef.current);
    intervalRef.current = null;
    setUploading(false);
    setFile(null);
    setProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (onClear) onClear();
  };

  const fileIcon = () => {
    if (!file) return null;
    if (file.type.includes("pdf")) return "📄";
    return variant === "medical" ? "🩺" : "✍️";
  };

  return (
    <div className="signature-uploader">
      {!file && !uploading && (
        <>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*,.pdf"
            className="signature-uploader__input"
          />
          <button
            className="signature-uploader__dropzone"
            type="button"
            aria-label={`${title}. ${subtitle}`}
            onClick={() => fileInputRef.current?.click()}
            onMouseOver={(e) =>
              (e.currentTarget.style.borderColor = "var(--primary)")
            }
            onMouseOut={(e) =>
              (e.currentTarget.style.borderColor = "var(--border-strong)")
            }
          >
            <svg
              width="28"
              height="28"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--foreground-subtle)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <div>
              <div className="signature-uploader__title">{title}</div>
              <div className="signature-uploader__subtitle">{subtitle}</div>
            </div>
          </button>
        </>
      )}

      {uploading && (
        <div className="signature-uploader__progress">
          <div className="signature-uploader__progress-label">
            <span>{uploadingLabel}</span>
            <span>{progress}%</span>
          </div>
          <div className="signature-uploader__progress-track">
            <div
              className="signature-uploader__progress-fill"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {file && (
        <div className="signature-uploader__file">
          <div className="signature-uploader__file-icon">{fileIcon()}</div>

          <div className="signature-uploader__file-copy">
            <div className="signature-uploader__file-name">{file.name}</div>
            <div className="signature-uploader__file-meta">
              {(file.size / 1024).toFixed(1)} KB · {statusLabel}
            </div>
          </div>

          <button
            className="btn btn-ghost btn-sm signature-uploader__remove"
            type="button"
            onClick={handleClear}
          >
            Remove
          </button>
        </div>
      )}
    </div>
  );
}
