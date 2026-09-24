// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter, useLocation, useNavigate } from 'react-router-dom';
import App from '../src/App';
import { getRuntimeMode, isLegacyDemoWorkflowEnabled, parseRuntimeMode } from '../src/services/runtimeMode';
import { ThemeProvider } from '../src/context/ThemeContext';
import { ToastProvider } from '../src/context/ToastContext';
import { MatchProvider } from '../src/context/MatchContext';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let root: ReturnType<typeof createRoot> = undefined!;

function LocationProbe() {
  const location = useLocation();
  const navigate = useNavigate();
  return (
    <>
      <output data-testid="location">{location.pathname}</output>
      <button type="button" data-testid="navigate-donor" onClick={() => navigate('/donor')}>Navigate to donor route</button>
    </>
  );
}

function renderApp(initialEntries = ['/'], fetchImpl: typeof fetch | null = null) {
  if (!import.meta.env.VITE_RUNTIME_MODE) vi.stubEnv('VITE_RUNTIME_MODE', 'synthetic');
  sessionStorage.clear();
  vi.spyOn(globalThis, 'fetch').mockImplementation(fetchImpl || (async (url) => {
    const href = String(url);
    if (href.endsWith('/auth/session')) return { ok: false, status: 401, json: async () => ({ success: false }) } as Response;
    if (href.endsWith('/v1/csrf')) return { ok: true, status: 200, json: async () => ({ success: true }) } as Response;
    if (href.endsWith('/auth/logout')) return { ok: true, status: 204, json: async () => null } as Response;
    return { ok: true, status: 200, json: async () => ({ success: true, data: [] }) };
  }) as typeof fetch);
  document.body.innerHTML = '<div id="root"></div>';
  root = createRoot(document.getElementById('root'));
  act(() => root.render(
    <ThemeProvider>
      <ToastProvider>
        <MemoryRouter initialEntries={initialEntries}>
          <MatchProvider>
            <App />
            <LocationProbe />
          </MatchProvider>
        </MemoryRouter>
      </ToastProvider>
    </ThemeProvider>,
  ));
  return document.body;
}

afterEach(() => {
  act(() => root?.unmount());
  root = undefined!;
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe('runtime mode configuration', () => {
  it('accepts only the four supported runtime modes', () => {
    expect(parseRuntimeMode('synthetic')).toBe('synthetic');
    expect(parseRuntimeMode('partner-sandbox')).toBe('partner-sandbox');
    expect(parseRuntimeMode('controlled-live')).toBe('controlled-live');
    expect(parseRuntimeMode('production')).toBe('production');
    expect(parseRuntimeMode('SYNTHETIC')).toBeNull();
    expect(parseRuntimeMode('')).toBeNull();
    expect(parseRuntimeMode(undefined)).toBeNull();
  });

  it('fails closed when VITE_RUNTIME_MODE is missing or invalid', () => {
    vi.stubEnv('VITE_RUNTIME_MODE', '');
    expect(getRuntimeMode()).toBe('unavailable');
    vi.stubEnv('VITE_RUNTIME_MODE', 'not-a-mode');
    expect(getRuntimeMode()).toBe('unavailable');
  });

  it('allows legacy workflow mutations only in synthetic mode', () => {
    expect(isLegacyDemoWorkflowEnabled('synthetic')).toBe(true);
    expect(isLegacyDemoWorkflowEnabled('partner-sandbox')).toBe(false);
    expect(isLegacyDemoWorkflowEnabled('controlled-live')).toBe(false);
    expect(isLegacyDemoWorkflowEnabled('production')).toBe(false);
    expect(isLegacyDemoWorkflowEnabled('unavailable')).toBe(false);
  });
});

async function enterEgovRole(role: string, logoutFails = false) {
  const fetchImpl = async (url: string | Request | URL) => {
    const href = String(url);
    if (href.endsWith('/auth/session')) {
      return {
        ok: true,
        status: 200,
        json: async () => ({ success: true, account: { role: 'citizen', id: 'citizen-1' } }),
      } as Response;
    }
    if (href.endsWith('/v1/csrf')) return { ok: true, status: 200, json: async () => ({ success: true }) } as Response;
    if (href.endsWith('/auth/logout')) return logoutFails
      ? { ok: false, status: 503, json: async () => ({ success: false, error: 'unavailable' }) } as Response
      : { ok: true, status: 204, json: async () => null } as Response;
    return { ok: true, status: 200, json: async () => ({ success: true, data: [] }) };
  };
  const body = renderApp(['/onboarding'], fetchImpl as unknown as typeof fetch);
  await vi.waitFor(() => expect(body.querySelector(`button.role-card-${role}`)).not.toBeNull(), { timeout: 1500 });
  act(() => (body.querySelector(`button.role-card-${role}`) as HTMLButtonElement).click());
  await vi.waitFor(() => expect(body.querySelector('[data-testid="location"]')?.textContent).toBe(`/${role}`), { timeout: 1500 });
  return body;
}

describe('citizen dashboard routing', () => {
  it('renders official eGovPH SSO guidance and no invitation inputs on onboarding', async () => {
    const body = renderApp(['/onboarding']);
    await vi.waitFor(() => expect(body.textContent).toContain('Sign in with official eGovPH'));
    expect(body.textContent).not.toContain('Recipient portal');
    expect(body.querySelector('#invitation-token')).toBeNull();
  });

  // Catches demo sign-in setting role without replacing the public URL.
  it('navigates a recipient eGov sign-in to /recipient', async () => {
    await enterEgovRole('recipient');
  });

  // Catches donor onboarding using a recipient or root canonical route.
  it('navigates a donor eGov sign-in to /donor', async () => {
    await enterEgovRole('donor');
  });

  it('allows one authenticated Citizen to open both case dashboards', async () => {
    const body = await enterEgovRole('recipient');
    act(() => body.querySelector('[data-testid="navigate-donor"]').click());
    await vi.waitFor(() => expect(body.textContent).toContain('Donor Care Journey'));
    expect(body.querySelector('[data-testid="location"]')?.textContent).toBe('/donor');
  });

  it('does not grant Citizen onboarding or dashboards to a Staff session', async () => {
    const fetchImpl = async (url: string | Request | URL) => {
      if (String(url).endsWith('/auth/session')) {
        return { ok: true, status: 200, json: async () => ({ success: true, account: { role: 'hospital_admin' } }) } as Response;
      }
      return { ok: true, status: 200, json: async () => ({ success: true, data: [] }) } as Response;
    };
    const body = renderApp(['/onboarding'], fetchImpl as unknown as typeof fetch);
    await vi.waitFor(() => expect(body.textContent).toContain('Sign in with official eGovPH'));
    expect(body.textContent).not.toContain('Recipient Portal');
    expect(body.textContent).not.toContain('Donor Portal');
    act(() => root?.unmount());
    const dashboard = renderApp(['/recipient'], fetchImpl as unknown as typeof fetch);
    await vi.waitFor(() => expect(dashboard.querySelector('[data-testid="location"]')?.textContent).toBe('/onboarding'));
  });

  // Catches role routes rendering before an in-memory role guard runs.
  it.each(['/recipient', '/donor'])('redirects a direct unauthenticated %s route to public onboarding', async (route) => {
    const body = renderApp([route]);
    await vi.waitFor(() => expect(body.querySelector('[data-testid="location"]')?.textContent).toBe('/onboarding'));
    expect(body.textContent).toContain('Sign in with official eGovPH');
  });

  // Catches sign-out clearing state without navigating away from the protected route.
  it('returns to public onboarding after citizen sign-out', async () => {
    const body = await enterEgovRole('recipient');
    act(() => Array.from(body.querySelectorAll('button')).find((button) => button.textContent.includes('Exit Role'))!.click());
    await vi.waitFor(() => expect(body.querySelector('[data-testid="location"]')?.textContent).toBe('/onboarding'));
    expect(body.textContent).toContain('Sign in with official eGovPH');
  });

  it('keeps the Citizen session when eBuhay cannot confirm sign-out', async () => {
    const body = await enterEgovRole('recipient', true);
    act(() => Array.from(body.querySelectorAll('button')).find((button) => button.textContent.includes('Exit Role'))!.click());
    await vi.waitFor(() => expect(body.textContent).toContain('Could not sign out. Please try again.'));
    expect(body.querySelector('[data-testid="location"]')?.textContent).toBe('/recipient');
    expect(body.textContent).not.toContain('Signed out successfully');
  });

  it('renders either portal for an authenticated citizen account', async () => {
    const fetchImpl = async (url: string | Request | URL) => {
      const href = String(url);
      if (href.endsWith('/auth/session')) return { ok: true, status: 200, json: async () => ({ success: true, account: { role: 'citizen' } }) } as Response;
      if (href.endsWith('/platform/services')) return { ok: true, status: 200, json: async () => ({ success: true, data: [] }) } as Response;
      if (href.endsWith('/platform/cases')) return { ok: true, status: 200, json: async () => ({ success: true, data: [] }) } as Response;
      return { ok: true, status: 200, json: async () => ({ success: true, data: [] }) };
    };
    const body = renderApp(['/donor'], fetchImpl as unknown as typeof fetch);
    await vi.waitFor(() => expect(body.textContent).toContain('Donor Care Journey'));
    expect(body.textContent).not.toContain('citizen');
  });

  it('redirects unauthenticated recipient route to public landing without unavailable banner', async () => {
    const body = renderApp(['/recipient']);
    await vi.waitFor(() => expect(body.querySelector('[data-testid="location"]')?.textContent).toBe('/onboarding'));
    expect(body.textContent).toContain('Sign in with official eGovPH');
  });

  it('redirects unauthenticated hospital dashboard to staff sign-in without unavailable banner', async () => {
    const body = renderApp(['/hospital-dashboard']);
    await vi.waitFor(() => expect(body.querySelector('[data-testid="location"]')?.textContent).toBe('/staff-sign-in'));
    expect(body.textContent).not.toContain('workflow is unavailable');
  });

  it('renders public landing at / without unavailable banner', async () => {
    const body = renderApp(['/']);
    await vi.waitFor(() => expect(body.textContent).toContain('A clearer path through transplant coordination'));
    expect(body.textContent).not.toContain('workflow is unavailable');
  });
});
