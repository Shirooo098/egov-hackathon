import "../../styles/components/onboarding/EgovSsoForm.css";
import Stepper, {
  ONBOARDING_SIGNIN_STEPS,
} from "./Stepper";
import { useEffect, useRef, useState } from "react";
import { api } from "../../services/api";

type WidgetConfig = { partnerCode: string; baseUrl: string };
type PendingIdentity = { displayName: string; pendingId: string };
type EgovWidget = {
  render: (options: {
    target: string;
    partnerCode: string;
    host: string;
    partnerName: string;
    onSuccess: (value: unknown) => void;
  }) => void;
};

declare global {
  interface Window {
    EgovLogin?: EgovWidget;
  }
}

type Props = {
  pendingRole: string | null;
  ssoError?: string;
  ssoLoading?: boolean;
  onBack: () => void;
  onConfirmed?: (account: unknown) => void;
};

export default function EgovSsoForm({
  pendingRole,
  ssoError,
  ssoLoading,
  onBack,
  onConfirmed,
}: Props) {
  const widgetTarget = useRef<HTMLDivElement>(null);
  const [config, setConfig] = useState<WidgetConfig | null>(null);
  const [pending, setPending] = useState<PendingIdentity | null>(null);
  const [loading, setLoading] = useState(Boolean(ssoLoading));
  const [error, setError] = useState(ssoError ?? "");

  const loadPending = async () => {
    try {
      const result = await api.auth.egovPending();
      const data = result.data as Partial<PendingIdentity> | undefined;
      if (typeof data?.displayName === "string" && typeof data.pendingId === "string") {
        setPending({ displayName: data.displayName, pendingId: data.pendingId });
      }
    } catch (cause) {
      if ((cause as { status?: number }).status !== 404) throw cause;
    }
  };

  useEffect(() => {
    let cancelled = false;
    const start = async () => {
      try {
        const [widget] = await Promise.all([api.auth.egovWidgetConfig(), loadPending()]);
        if (!cancelled) setConfig(widget.data as WidgetConfig);
      } catch (cause) {
        if (!cancelled) setError(cause instanceof Error ? cause.message : "Official eGov authentication is unavailable. Please retry.");
      }
    };
    void start();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!config || pending || !widgetTarget.current) return;
    const script = document.createElement("script");
    script.src = "https://widgets.e.gov.ph/v1.0.0/egov-login.min.js";
    script.async = true;
    script.onload = () => {
      if (!window.EgovLogin) {
        setError("Official eGov authentication is unavailable. Please retry.");
        return;
      }
      window.EgovLogin.render({
        target: "#egov-login",
        partnerCode: config.partnerCode,
        host: config.baseUrl,
        partnerName: "eBuhay",
        onSuccess: async (value) => {
          const exchangeCode = (value as { exchangeCode?: unknown } | null)?.exchangeCode;
          if (typeof exchangeCode !== "string" || !exchangeCode) {
            setError("eGovPH did not return a valid sign-in response. Please retry.");
            return;
          }
          setLoading(true);
          setError("");
          try {
            await api.auth.csrf();
            await api.auth.egovExchange(exchangeCode);
            await loadPending();
          } catch (cause) {
            setError(cause instanceof Error ? cause.message : "Official eGov authentication is unavailable. Please retry.");
          } finally { setLoading(false); }
        },
      });
    };
    script.onerror = () => setError("Official eGov authentication is unavailable. Please retry.");
    document.head.appendChild(script);
    return () => { script.remove(); };
  }, [config, pending]);

  const confirm = async () => {
    if (!pending) return;
    setLoading(true); setError("");
    try {
      await api.auth.csrf();
      const result = await api.auth.egovConfirm(pending.pendingId);
      onConfirmed?.(result.account);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "We could not confirm this eGov identity. Please retry."); }
    finally { setLoading(false); }
  };

  const cancel = async () => {
    if (!pending) return;
    setLoading(true); setError("");
    try { await api.auth.csrf(); await api.auth.egovCancel(pending.pendingId); setPending(null); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "We could not cancel this sign-in. Please retry."); }
    finally { setLoading(false); }
  };

  return (
    <div className="anim-in">
      {pendingRole && <Stepper steps={ONBOARDING_SIGNIN_STEPS} active={3} />}
      {pendingRole && (
        <div className="portal-status-bar migrated-2f55da8d">
          <span>
            {pendingRole === "recipient" ? "Recipient" : "Donor"} portal — eGovPH sign-in
          </span>
          <button
            type="button"
            className="btn btn-ghost btn-sm portal-change-btn migrated-6dac5f26"
            onClick={onBack}
            aria-label="Change portal"
          >
            Change
          </button>
        </div>
      )}

      <h3 className="migrated-1f2c3427">
        {pending ? "Confirm your verified eGovPH identity" : "Sign in with official eGovPH"}
      </h3>

      <div role="status" aria-live="polite" className="migrated-78d8b799">
        <p>
          Official eGov Single Sign-On staging is the only supported Citizen login method. eBuhay never asks for an OTP, PIN, exchange code, or provider secret.
          {pending && <><br />Verified identity: <strong>{pending.displayName}</strong>. Confirm only if this is you.</>}
        </p>
        {loading && <p>Checking sign-in status…</p>}
      </div>

      {error && (
        <div className="migrated-13ec00a5" role="alert" aria-live="assertive">
          {error}
        </div>
      )}

      {pending ? <div className="migrated-1d233a92">
        <button className="btn btn-primary migrated-7e90f870" type="button" onClick={confirm} disabled={loading}>Confirm identity</button>
        <button className="btn btn-ghost migrated-7e90f870" type="button" onClick={cancel} disabled={loading}>Cancel</button>
      </div> : <div id="egov-login" ref={widgetTarget} aria-label="Official eGovPH sign-in" />}

      <div className="migrated-1d233a92">
        <button
          className="btn btn-ghost migrated-7e90f870"
          type="button"
          onClick={onBack}
        >
          Back
        </button>
      </div>
    </div>
  );
}
