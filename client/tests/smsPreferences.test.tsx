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
  const request = vi.spyOn(api, 'request').mockImplementation(async (_path, options) => ({
    success: true,
    data: { smsConsent: options?.method === 'PUT' ? JSON.parse(String(options.body)).smsConsent : false, phoneNumberMasked: '+639****4567' },
  }));
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
