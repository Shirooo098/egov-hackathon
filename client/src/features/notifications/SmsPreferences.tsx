import { useEffect, useState } from 'react';
import { api } from '../../services/api';

type Preference = { smsConsent: boolean; phoneNumberMasked: string | null };
type SmsRequest = { status: string; purpose: string };
type History = SmsRequest[] | 'unavailable' | null;
const preferenceOf = (result: Record<string, unknown>): Preference => {
  const value = result.data as Partial<Preference> | undefined;
  if (typeof value?.smsConsent !== 'boolean' || (value.phoneNumberMasked !== null && typeof value.phoneNumberMasked !== 'string')) throw new Error('Invalid SMS preference response');
  return value as Preference;
};

export default function SmsPreferences() {
  const [preference, setPreference] = useState<Preference | null>(null);
  const [history, setHistory] = useState<History>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    let active = true;
    api.request('/v1/notifications/preferences')
      .then((result) => { if (active) setPreference(preferenceOf(result)); })
      .catch(() => { if (active) setMessage('SMS preferences are unavailable. Please retry later.'); });
    api.request('/v1/notifications?format=page')
      .then((result) => {
        if (!active) return;
        const value = result.data as { items?: unknown } | undefined;
        if (!Array.isArray(value?.items)) throw new Error('Invalid SMS history response');
        if (value.items.some((item) => !item || typeof item !== 'object' || typeof (item as Record<string, unknown>).channel !== 'string')) throw new Error('Invalid SMS history item');
        // ponytail: inspect the newest notification page only; paginate if older SMS history is needed.
        setHistory(value.items.filter((item) => {
          if (!item || typeof item !== 'object') return false;
          const row = item as Record<string, unknown>;
          return row.channel === 'external_sms' || row.channel === 'emessage';
        }).slice(0, 5).map((item) => {
          const row = item as Record<string, unknown>;
          return {
            status: typeof row.deliveryStatus === 'string' ? row.deliveryStatus : 'unknown',
            purpose: smsPurposeLabel(row.template),
          };
        }));
      })
      .catch(() => { if (active) setHistory('unavailable'); });
    return () => { active = false; };
  }, []);

  const save = async (smsConsent: boolean) => {
    setBusy(true);
    setMessage('');
    try {
      await api.auth.csrf();
      const result = await api.request('/v1/notifications/preferences', {
        method: 'PUT',
        body: JSON.stringify({ smsConsent }),
      });
      setPreference(preferenceOf(result));
      setMessage(smsConsent ? 'SMS requests are enabled for your verified mobile. Delivery is not guaranteed.' : 'SMS requests are turned off.');
    } catch {
      setMessage('Could not update SMS preferences. Please retry.');
    } finally { setBusy(false); }
  };

  return (
    <section className="card dashboard-section-gap" aria-labelledby="sms-preferences-heading">
      <h2 id="sms-preferences-heading">Text message updates</h2>
      <p>Optional eMessage updates cover appointment changes, application status, and document actions. Messages contain no medical details.</p>
      {preference ? (
        preference.phoneNumberMasked ? (
          <>
            <p>eGovPH mobile: <strong>{preference.phoneNumberMasked}</strong>. {preference.smsConsent ? 'SMS requests are on.' : 'SMS requests are off.'}</p>
            <button className="btn btn-primary" type="button" disabled={busy} onClick={() => void save(!preference.smsConsent)}>
              {preference.smsConsent ? 'Turn off SMS updates' : 'Enable SMS updates'}
            </button>
          </>
        ) : <p>No mobile number was shared by eGovPH. SMS updates are unavailable.</p>
      ) : !message && <p role="status">Loading SMS preferences…</p>}
      {message && <p role="status" aria-live="polite">{message}</p>}
      <div aria-label="Recent SMS request statuses">
        <h3>Recent SMS requests</h3>
        {history === null && <p role="status">Loading recent SMS requests…</p>}
        {history === 'unavailable' && <p role="status">SMS request history is unavailable. Please retry later.</p>}
        {Array.isArray(history) && history.length === 0 && <p>No recent SMS requests.</p>}
        {Array.isArray(history) && history.length > 0 && <ol>{history.map((request, index) => <li key={index}>{request.purpose}: {smsStatusLabel(request.status)}</li>)}</ol>}
      </div>
    </section>
  );
}

function smsStatusLabel(status: string): string {
  switch (status.toLowerCase()) {
    case 'accepted': return 'Accepted by eMessage — delivery unconfirmed.';
    case 'pending': return 'SMS request pending — delivery unconfirmed.';
    case 'sending': return 'Submission status unconfirmed — awaiting review.';
    case 'unavailable': return 'Provider status unavailable — delivery unconfirmed.';
    case 'failed': return 'SMS request failed — delivery unconfirmed.';
    case 'suppressed': return 'SMS request suppressed — not sent.';
    default: return 'SMS request status is unavailable — delivery not confirmed.';
  }
}

function smsPurposeLabel(template: unknown): string {
  switch (template) {
    case 'appointment_scheduled': return 'Appointment update';
    case 'application_status_update': return 'Application status update';
    case 'action_required': return 'Document action';
    default: return 'Text update';
  }
}
