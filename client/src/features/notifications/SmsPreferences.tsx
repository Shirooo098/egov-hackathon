import { useEffect, useState } from 'react';
import { api } from '../../services/api';

type Preference = { smsConsent: boolean; phoneNumberMasked: string | null };
const preferenceOf = (result: Record<string, unknown>): Preference => {
  const value = result.data as Partial<Preference> | undefined;
  if (typeof value?.smsConsent !== 'boolean' || (value.phoneNumberMasked !== null && typeof value.phoneNumberMasked !== 'string')) throw new Error('Invalid SMS preference response');
  return value as Preference;
};

export default function SmsPreferences() {
  const [preference, setPreference] = useState<Preference | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    let active = true;
    api.request('/v1/notifications/preferences')
      .then((result) => { if (active) setPreference(preferenceOf(result)); })
      .catch(() => { if (active) setMessage('SMS preferences are unavailable. Please retry later.'); });
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
    </section>
  );
}
