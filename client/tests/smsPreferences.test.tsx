// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { api } from '../src/services/api';
import SmsPreferences from '../src/features/notifications/SmsPreferences';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let root: ReturnType<typeof createRoot> | undefined;
afterEach(() => { if (root) act(() => root!.unmount()); root = undefined; vi.restoreAllMocks(); });

it('offers explicit opt-in and revocation without accepting a browser phone number', async () => {
  const request = vi.spyOn(api, 'request').mockImplementation(async (path, options) => path === '/v1/notifications?format=page'
    ? { success: true, data: { items: [] } }
    : { success: true, data: { smsConsent: options?.method === 'PUT' ? JSON.parse(String(options.body)).smsConsent : false, phoneNumberMasked: '+639****4567' } });
  vi.spyOn(api.auth, 'csrf').mockResolvedValue({ success: true });
  document.body.innerHTML = '<div id="root"></div>';
  root = createRoot(document.getElementById('root')!);
  await act(async () => { root!.render(<SmsPreferences />); });
  await vi.waitFor(() => expect(document.body.textContent).toContain('SMS requests are off'));
  expect(document.querySelector('input')).toBeNull();
  await act(async () => { document.querySelector<HTMLButtonElement>('button')!.click(); });
  expect(request).toHaveBeenCalledWith('/v1/notifications/preferences', { method: 'PUT', body: JSON.stringify({ smsConsent: true }) });
  expect(document.body.textContent).toContain('SMS requests are on');
  await act(async () => { document.querySelector<HTMLButtonElement>('button')!.click(); });
  expect(request).toHaveBeenCalledWith('/v1/notifications/preferences', { method: 'PUT', body: JSON.stringify({ smsConsent: false }) });
  expect(document.querySelector<HTMLButtonElement>('button')?.textContent).toBe('Enable SMS updates');
  await act(async () => { document.querySelector<HTMLButtonElement>('button')!.click(); });
  expect(document.body.textContent).toContain('SMS requests are on');
});

it('shows conservative SMS request statuses and an unavailable history state', async () => {
  let historyFailure = false;
  const request = vi.spyOn(api, 'request').mockImplementation(async (path) => {
    if (path === '/v1/notifications?format=page' && historyFailure) throw new Error('history unavailable');
    if (path === '/v1/notifications?format=page') return {
      success: true,
      data: { items: [
        { channel: 'external_sms', template: 'appointment_scheduled', deliveryStatus: 'accepted' },
        { channel: 'external_sms', template: 'application_status_update', deliveryStatus: 'sending' },
        { channel: 'external_sms', template: 'action_required', deliveryStatus: 'unavailable' },
        { channel: 'external_sms', template: 'action_required', deliveryStatus: 'failed' },
        { channel: 'external_sms', template: 'action_required', deliveryStatus: 'suppressed' },
        { channel: 'in_app', template: 'action_required', deliveryStatus: 'delivered' },
      ] },
    };
    return { success: true, data: { smsConsent: false, phoneNumberMasked: null } };
  });
  document.body.innerHTML = '<div id="root"></div>';
  root = createRoot(document.getElementById('root')!);
  await act(async () => { root!.render(<SmsPreferences />); });
  await vi.waitFor(() => expect(document.body.textContent).toContain('Accepted by eMessage'));
  expect(document.body.textContent).toContain('Appointment update');
  expect(document.body.textContent).toContain('awaiting review');
  expect(document.body.textContent).toContain('Provider status unavailable');
  expect(document.body.textContent).toContain('delivery unconfirmed');
  expect(document.body.textContent).toContain('not sent');
  expect(document.body.textContent).not.toMatch(/\bdelivered\b/i);
  expect(request).toHaveBeenCalledWith('/v1/notifications?format=page');

  historyFailure = true;
  await act(async () => { root!.unmount(); root = createRoot(document.getElementById('root')!); root.render(<SmsPreferences />); });
  await vi.waitFor(() => expect(document.body.textContent).toContain('SMS request history is unavailable'));
});
