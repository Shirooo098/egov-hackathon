import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

const ToastContext = createContext(null);

let toastId = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info', options = {}) => {
    const id = ++toastId;
    const duration = options.duration ?? 5000;

    setToasts(prev => [...prev, { id, message, type, duration, options }]);

    if (duration > 0) {
      setTimeout(() => removeToast(id), duration);
    }

    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const toast = useCallback((message, options = {}) => addToast(message, 'info', options), [addToast]);
  toast.success = (message, options) => addToast(message, 'success', options);
  toast.error = (message, options) => addToast(message, 'error', options);
  toast.warning = (message, options) => addToast(message, 'warning', options);
  toast.info = (message, options) => addToast(message, 'info', options);

  return (
    <ToastContext.Provider value={{ toasts, removeToast, toast }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
}

function ToastContainer({ toasts, onRemove }) {
  return (
    <div className="toast-container" role="region" aria-label="Notifications" aria-live="polite">
      {toasts.map(t => (
        <Toast key={t.id} toast={t} onRemove={onRemove} />
      ))}
    </div>
  );
}

function Toast({ toast, onRemove }) {
  const { message, type, duration, options } = toast;
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        setExiting(true);
        setTimeout(() => onRemove(toast.id), 200);
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, toast.id, onRemove]);

  const icons = {
    success: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>,
    error: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>,
    warning: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>,
    info: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
  };

  const classNames = {
    success: 'toast-success',
    error: 'toast-error',
    warning: 'toast-warning',
    info: 'toast-info'
  };

  return (
    <div
      className={`toast ${classNames[type]} ${exiting ? 'toast-exit' : ''}`}
      style={{ animation: exiting ? 'toastOut 0.2s ease forwards' : 'toastIn 0.3s var(--ease-up)' }}
      role="alert"
      aria-live="assertive"
    >
      <div className="toast-icon">{icons[type]}</div>
      <div className="toast-content">
        {options.title && <div className="toast-title">{options.title}</div>}
        <div className="toast-message">{message}</div>
      </div>
      <button
        className="toast-close"
        onClick={() => { setExiting(true); setTimeout(() => onRemove(toast.id), 200); }}
        aria-label="Dismiss"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
      {duration > 0 && (
        <div className="toast-progress" style={{ animationDuration: `${duration}ms` }} />
      )}
    </div>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context.toast;
}