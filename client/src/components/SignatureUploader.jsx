import React, { useState, useRef } from 'react';

export default function SignatureUploader({
  onUploadComplete,
  onClear,
  title = 'Upload E-Signature',
  subtitle = 'Supports PNG, JPG, or PDF (max 5MB)',
  uploadingLabel = 'Uploading signature document...',
  statusLabel = 'e-signed',
  variant = 'signature', // 'signature' | 'medical'
}) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    setUploading(true);
    setProgress(0);
    setFile(null);

    // Simulate progress bar over 1 second
    let currentProgress = 0;
    const interval = setInterval(() => {
      currentProgress += 20;
      setProgress(currentProgress);
      if (currentProgress >= 100) {
        clearInterval(interval);
        setUploading(false);
        setFile(selectedFile);
        if (onUploadComplete) onUploadComplete(selectedFile);
      }
    }, 150);
  };

  const handleClear = () => {
    setFile(null);
    setProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (onClear) onClear();
  };

  const fileIcon = () => {
    if (!file) return null;
    if (file.type.includes('pdf')) return '📄';
    return variant === 'medical' ? '🩺' : '✍️';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {!file && !uploading && (
        <div
          onClick={() => fileInputRef.current?.click()}
          style={{
            border: '2px dashed var(--border-strong)',
            borderRadius: 'var(--r-md)',
            padding: '24px',
            textAlign: 'center',
            cursor: 'pointer',
            background: 'var(--background-alt)',
            transition: 'border-color var(--t-fast)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 8,
            minHeight: 120,
            justifyContent: 'center',
            boxSizing: 'border-box',
          }}
          onMouseOver={(e) => (e.currentTarget.style.borderColor = 'var(--primary)')}
          onMouseOut={(e) => (e.currentTarget.style.borderColor = 'var(--border-strong)')}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*,.pdf"
            style={{ display: 'none' }}
          />
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--foreground-subtle)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          <div>
            <div style={{ fontSize: 13, fontWeight: 700 }}>{title}</div>
            <div style={{ fontSize: 11, color: 'var(--foreground-muted)', marginTop: 2 }}>{subtitle}</div>
          </div>
        </div>
      )}

      {uploading && (
        <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: 16, background: 'var(--background-alt)', minHeight: 120, display: 'flex', flexDirection: 'column', justifyContent: 'center', boxSizing: 'border-box' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 600, marginBottom: 8 }}>
            <span>{uploadingLabel}</span>
            <span>{progress}%</span>
          </div>
          <div style={{ height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
            <div style={{ width: `${progress}%`, height: '100%', background: 'var(--primary)', transition: 'width 0.15s ease' }} />
          </div>
        </div>
      )}

      {file && (
        <div style={{ border: '1px solid rgba(5,150,105,0.2)', borderRadius: 'var(--r-md)', padding: 14, background: 'rgba(5,150,105,0.02)', display: 'flex', alignItems: 'center', gap: 14, minHeight: 120, boxSizing: 'border-box' }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 8,
              background: 'white',
              border: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 20,
              flexShrink: 0,
            }}
          >
            {fileIcon()}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.name}</div>
            <div style={{ fontSize: 11, color: 'var(--foreground-muted)', marginTop: 2 }}>
              {(file.size / 1024).toFixed(1)} KB · {statusLabel}
            </div>
          </div>

          <button className="btn btn-ghost btn-sm" type="button" onClick={handleClear} style={{ color: 'var(--destructive)', height: 32, padding: '0 8px' }}>
            Remove
          </button>
        </div>
      )}
    </div>
  );
}
