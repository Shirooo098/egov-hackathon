// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { AuthProvider, useAuth } from '../src/context/AuthContext';
import { api } from '../src/services/api';
import EgovSsoForm from '../src/features/onboarding/EgovSsoForm';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let root: ReturnType<typeof createRoot> | undefined;

function render(node: React.ReactNode) {
  document.body.innerHTML = '<div id="root"></div>';
  root = createRoot(document.getElementById('root')!);
  act(() => root!.render(node));
  return document.body;
}

afterEach(() => {
  if (root) act(() => root!.unmount());
  root = undefined;
  delete window.EgovLogin;
  vi.restoreAllMocks();
});

describe('Official eGov SSO boundary and guidance', () => {
  it('api.auth and AuthContext do not expose invitation redemption or client callback exchange', () => {
    expect((api.auth as Record<string, unknown>).redeemInvitation).toBeUndefined();
    expect((api.auth as Record<string, unknown>).egovCallback).toBeUndefined();

    let authContext: ReturnType<typeof useAuth> | undefined;
    function TestConsumer() {
      authContext = useAuth();
      return <div data-testid="status">{authContext?.status}</div>;
    }

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>,
    );

    expect((authContext as Record<string, unknown> | undefined)?.redeemInvitation).toBeUndefined();
    expect((authContext as Record<string, unknown> | undefined)?.signInEgov).toBeUndefined();
  });

  it('EgovSsoForm never exposes invitation-token inputs and displays truthful unavailable guidance', () => {
    const onBack = vi.fn();
    const body = render(
      <EgovSsoForm
        pendingRole="recipient"
        onBack={onBack}
      />,
    );

    expect(body.textContent).toContain('Sign in with official eGovPH');
    expect(body.textContent).toContain('Recipient portal — eGovPH sign-in');
    expect(body.textContent).toContain('eBuhay never asks for an OTP, PIN, exchange code, or provider secret');
    expect(body.textContent).not.toContain('Invitation access');
    expect(body.querySelector('#invitation-token')).toBeNull();
    expect(body.querySelector('form')).toBeNull();
    expect(body.querySelector('input')).toBeNull();
    expect(body.querySelector('[role="status"]')).not.toBeNull();
  });

  it('confirms the exact pending identity returned by the server', async () => {
    vi.spyOn(api.auth, 'egovWidgetConfig').mockResolvedValue({ success: true, data: { partnerCode: 'partner', baseUrl: 'https://staging.e.gov.ph' } });
    vi.spyOn(api.auth, 'egovPending').mockResolvedValue({ success: true, data: { displayName: 'Maria Santos', pendingId: 'pending-42' } });
    vi.spyOn(api.auth, 'csrf').mockResolvedValue({ success: true });
    const confirm = vi.spyOn(api.auth, 'egovConfirm').mockResolvedValue({ success: true, account: { role: 'citizen' } });
    const onConfirmed = vi.fn();
    const body = render(<EgovSsoForm pendingRole="recipient" onBack={() => {}} onConfirmed={onConfirmed} />);

    await vi.waitFor(() => expect(body.textContent).toContain('Maria Santos'));
    await act(async () => { body.querySelector('button') && [...body.querySelectorAll('button')].find((button) => button.textContent?.includes('Confirm identity'))?.click(); });
    expect(confirm).toHaveBeenCalledWith('pending-42');
    expect(onConfirmed).toHaveBeenCalledWith({ role: 'citizen' });
  });

  it('uses the documented widget global and exchangeCode callback', async () => {
    vi.spyOn(api.auth, 'egovWidgetConfig').mockResolvedValue({ success: true, data: { partnerCode: 'partner', baseUrl: 'https://staging.e.gov.ph' } });
    const missing = Object.assign(new Error('missing'), { status: 404 });
    vi.spyOn(api.auth, 'egovPending').mockRejectedValueOnce(missing).mockResolvedValue({ success: true, data: { displayName: 'Maria Santos', pendingId: 'pending-42' } });
    vi.spyOn(api.auth, 'csrf').mockResolvedValue({ success: true });
    const exchange = vi.spyOn(api.auth, 'egovExchange').mockResolvedValue({ success: true });
    let widgetOptions: Parameters<NonNullable<Window['EgovLogin']>['render']>[0] | undefined;
    window.EgovLogin = { render: (options) => { widgetOptions = options; } };
    const body = render(<EgovSsoForm pendingRole={null} onBack={() => {}} />);
    await vi.waitFor(() => expect(document.head.querySelector('script[src="https://widgets.e.gov.ph/v1.0.0/egov-login.min.js"]')).not.toBeNull());
    await act(async () => { document.head.querySelector('script[src="https://widgets.e.gov.ph/v1.0.0/egov-login.min.js"]')!.dispatchEvent(new Event('load')); });
    expect(widgetOptions?.target).toBe('#egov-login');
    await act(async () => { await widgetOptions?.onSuccess({ exchangeCode: 'one-time-code' }); });
    expect(exchange).toHaveBeenCalledWith('one-time-code');
    await vi.waitFor(() => expect(body.textContent).toContain('Maria Santos'));
  });

  it('rejects a malformed widget callback without contacting the backend', async () => {
    vi.spyOn(api.auth, 'egovWidgetConfig').mockResolvedValue({ success: true, data: { partnerCode: 'partner', baseUrl: 'https://staging.e.gov.ph' } });
    vi.spyOn(api.auth, 'egovPending').mockRejectedValue(Object.assign(new Error('missing'), { status: 404 }));
    const csrf = vi.spyOn(api.auth, 'csrf');
    const exchange = vi.spyOn(api.auth, 'egovExchange');
    let onSuccess: ((value: unknown) => void) | undefined;
    window.EgovLogin = { render: (options) => { onSuccess = options.onSuccess; } };
    const body = render(<EgovSsoForm pendingRole={null} onBack={() => {}} />);

    await vi.waitFor(() => expect(document.head.querySelector('script[src="https://widgets.e.gov.ph/v1.0.0/egov-login.min.js"]')).not.toBeNull());
    await act(async () => { document.head.querySelector('script[src="https://widgets.e.gov.ph/v1.0.0/egov-login.min.js"]')!.dispatchEvent(new Event('load')); });
    await act(async () => { await onSuccess?.({}); });

    expect(csrf).not.toHaveBeenCalled();
    expect(exchange).not.toHaveBeenCalled();
    await vi.waitFor(() => expect(body.querySelector('[role="alert"]')?.textContent).toContain('eGovPH did not return a valid sign-in response. Please retry.'));
    expect(body.textContent).not.toContain('Confirm your verified eGovPH identity');
  });

  it('EgovSsoForm displays callback errors in an accessible alert region', () => {
    const onBack = vi.fn();
    const body = render(
      <EgovSsoForm
        pendingRole="recipient"
        ssoError="eGovPH sign-in could not be completed. Please start again from eGovPH."
        onBack={onBack}
      />,
    );

    const alert = body.querySelector('[role="alert"]');
    expect(alert).not.toBeNull();
    expect(alert?.textContent).toContain('eGovPH sign-in could not be completed');
  });

  it('AuthProvider restores existing citizen session without client-side callback exchange', async () => {
    vi.spyOn(api.auth, 'session').mockResolvedValue({
      success: true,
      account: {
        id: 'acct-citizen-1',
        role: 'citizen',
        displayName: 'Maria Santos',
      },
    });

    let authContext: ReturnType<typeof useAuth> | undefined;

    function TestConsumer() {
      authContext = useAuth();
      return (
        <div>
          <span data-testid="status">{authContext?.status}</span>
          <span data-testid="role">{authContext?.session?.account?.role}</span>
        </div>
      );
    }

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>,
    );

    await vi.waitFor(() => expect(authContext?.status).toBe('authenticated'));
    expect(authContext?.session?.account.role).toBe('citizen');
    expect(authContext?.session?.account.displayName).toBe('Maria Santos');
  });

  it('Hospital Staff auth remains unchanged and authorizes staff members', async () => {
    vi.spyOn(api.auth, 'session').mockResolvedValue({ success: false });
    vi.spyOn(api.auth, 'staffSignIn').mockResolvedValue({
      success: true,
      account: {
        id: 'staff-1',
        role: 'hospital_admin',
        displayName: 'Dr. Ana Santos',
      },
    });

    let authContext: ReturnType<typeof useAuth> | undefined;

    function TestConsumer() {
      authContext = useAuth();
      return <div>{authContext?.status}</div>;
    }

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>,
    );

    await act(async () => {
      await authContext?.signInStaff('ana.santos', 'correct-password', '123456');
    });

    expect(authContext?.status).toBe('authenticated');
    expect(authContext?.session?.account.role).toBe('hospital_admin');
    expect(authContext?.session?.account.displayName).toBe('Dr. Ana Santos');
  });

  it('Hospital Staff auth rejects non-staff roles', async () => {
    vi.spyOn(api.auth, 'session').mockResolvedValue({ success: false });
    vi.spyOn(api.auth, 'staffSignIn').mockResolvedValue({
      success: true,
      account: {
        id: 'imposter-1',
        role: 'citizen',
        displayName: 'Imposter',
      },
    });

    let authContext: ReturnType<typeof useAuth> | undefined;

    function TestConsumer() {
      authContext = useAuth();
      return <div>{authContext?.status}</div>;
    }

    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>,
    );

    let caughtError: unknown;
    await act(async () => {
      try {
        await authContext?.signInStaff('fake', 'fake', '000000');
      } catch (err) {
        caughtError = err;
      }
    });

    expect(caughtError).toBeDefined();
    expect((caughtError as Error).message).toContain('Staff sign-in was not authorized');
    expect(authContext?.session).toBeNull();
  });
});
