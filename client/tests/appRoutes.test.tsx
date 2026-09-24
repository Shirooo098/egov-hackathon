// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import App from '../src/App';
import { ThemeProvider } from '../src/context/ThemeContext';
import { ToastProvider } from '../src/context/ToastContext';
import { MatchProvider } from '../src/context/MatchContext';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

function setTestInputValue(input: Element | null, value: string) {
  if (!(input instanceof HTMLInputElement)) throw new Error('Expected input element');
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
  if (!setter) throw new Error('Input value setter unavailable');
  setter.call(input, value);
}

let root: ReturnType<typeof createRoot> = undefined!;
let mockSession: Record<string, unknown> | null = null;
let staffSignInBodies: Record<string, unknown>[] = [];

function renderApp(initialEntries = ['/'], clearSession = true) {
  if (!import.meta.env.VITE_RUNTIME_MODE) vi.stubEnv('VITE_RUNTIME_MODE', 'synthetic');
  if (clearSession) mockSession = null;
  staffSignInBodies = [];
  vi.spyOn(globalThis, 'fetch').mockImplementation((async (url, options = {}) => {
    const href = String(url);
    if (href.endsWith('/auth/session')) return mockSession
      ? { ok: true, status: 200, json: async () => ({ success: true, account: mockSession }) }
      : { ok: false, status: 401, json: async () => ({ success: false, message: 'Not signed in' }) };
    if (href.endsWith('/auth/staff/sign-in')) {
      const body = JSON.parse(String((options as RequestInit).body || '{}')) as Record<string, unknown>;
      staffSignInBodies.push(body);
      mockSession = body.username === 'ana.santos' && body.password === 'correct-password' && body.mfaCode === '123456'
        ? { id: 'staff-1', role: 'hospital_admin', displayName: 'Dr. Ana Santos', serviceScope: ['blood'], hospitalId: 'PGH-MNL-1000' }
        : { id: 'citizen-1', role: 'citizen', displayName: 'Citizen Tester', serviceScope: ['blood'] };
      return { ok: true, status: 201, json: async () => ({ success: true, account: mockSession }) };
    }
    if (href.endsWith('/v1/csrf')) {
      return { ok: true, status: 200, json: async () => ({ success: true }) } as Response;
    }
    if (href.endsWith('/auth/logout')) { mockSession = null; return { ok: true, status: 204, json: async () => null } as Response; }
    return { ok: true, status: 200, json: async () => ({ success: true, data: [] }) };
  }) as typeof fetch);
  window.history.replaceState({}, '', initialEntries[0]);
  if (clearSession) sessionStorage.clear();
  document.body.innerHTML = '<div id="root"></div>';
  root = createRoot(document.getElementById('root'));
  act(() => root.render(
    <ThemeProvider>
      <ToastProvider>
        <MemoryRouter initialEntries={initialEntries}>
          <MatchProvider><App /></MatchProvider>
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

describe('top-level rendered routes', () => {
  it('presents the public Civic Care landing page', () => {
    const body = renderApp();

    expect(body.textContent).toContain('Connecting recipients, donors, and coordination teams through one guided journey.');
    expect(body.textContent).toContain('This intended-pilot prototype is for invited testers and uses synthetic records and simulated hospital steps.');
    expect(body.textContent).not.toContain('National platform secured with eGov Single Sign-On and Face Liveness verification.');
    expect(body.querySelectorAll('a[href="/onboarding"]')).toHaveLength(4);
    expect(body.textContent).toContain('Simulated staff demo');
    expect(body.querySelector('.landing-preview[aria-hidden="true"]')).not.toBeNull();
    const closingActions = body.querySelector('nav.landing-closing-actions');
    expect(closingActions).not.toBeNull();
    expect(closingActions.querySelectorAll('a[href="/onboarding"]')).toHaveLength(2);
    expect(body.textContent).toContain('synthetic or simulated');
  });

  it('enters the existing focused onboarding flow without the mission hero', async () => {
    const body = renderApp();
    act(() => body.querySelector('a[href="/onboarding"]').click());

    await vi.waitFor(() => expect(body.textContent).toContain('Sign in with official eGovPH'));
    expect(body.textContent).toContain('Sign in with official eGovPH');
    expect(body.querySelector('#invitation-token')).toBeNull();
    expect(body.textContent).not.toContain('Staff demo');
    expect(body.textContent).not.toContain('Connecting recipients, donors, and coordination teams through one guided journey.');
  });

  it('enters the existing focused onboarding flow for Donors too', async () => {
    const body = renderApp();
    act(() => body.querySelector('a[href="/onboarding"]').click());

    await vi.waitFor(() => expect(body.textContent).toContain('Sign in with official eGovPH'));
    expect(body.textContent).not.toContain('Donor portal');
    expect(body.querySelector('#invitation-token')).toBeNull();
    expect(body.textContent).not.toContain('Staff demo');
    expect(body.textContent).not.toContain('Connecting recipients, donors, and coordination teams through one guided journey.');
  });

  it('returns invalid onboarding roles and the first-screen Back action to landing', async () => {
    const invalid = renderApp(['/onboarding/staff']);
    await vi.waitFor(() => expect(invalid.textContent).toContain('Sign in with official eGovPH'));
    act(() => invalid.querySelector('button')!.click());
    expect(invalid.textContent).toContain('A clearer path');
    expect(invalid.textContent).not.toContain('Step 2 — Sign In or Sign Up');
  });

  it('renders the distilled landing journey without repeated blocks', () => {
    const body = renderApp();
    expect(body.querySelector('main')).not.toBeNull();
    expect(body.querySelector('#what-happens-next')).not.toBeNull();
    expect(body.querySelectorAll('#what-happens-next .landing-steps > li')).toHaveLength(3);
    expect(body.querySelector('#prototype-status')).not.toBeNull();
    expect(body.textContent).toContain('What happens next');
    expect(body.textContent).toContain('How it works');
    expect(body.textContent).toContain('Who does what');
    expect(body.textContent).not.toContain('Ready when you are');
    expect(body.querySelector('.landing-status-cards')).toBeNull();
    expect(body.querySelector('.landing-role-grid')).toBeNull();
    expect(body.querySelector('.landing-repeat')).toBeNull();
  });

  it('keeps the public landing available for an active citizen role', async () => {
    mockSession = { id: 'citizen-1', role: 'citizen', displayName: 'Citizen Tester', serviceScope: ['blood'] };
    const body = renderApp(['/recipient'], false);
    await vi.waitFor(() => expect(body.textContent).toContain('Recipient Care Journey'));
    act(() => body.querySelector('.navbar-brand-link').click());
    await vi.waitFor(() => expect(body.textContent).toContain('Returning to your recipient journey?'));
    expect(body.querySelector('a[href="/recipient"]')).not.toBeNull();
    expect(body.querySelector('a[href="/onboarding"]')).not.toBeNull();
  });

  it('renders the Recipient Care Journey Rail with current dynamic facts', async () => {
    mockSession = { id: 'citizen-1', role: 'citizen', displayName: 'Citizen Tester', serviceScope: ['blood'] };
    const body = renderApp(['/recipient'], false);
    await vi.waitFor(() => expect(body.textContent).toContain('Recipient Care Journey'), { timeout: 1000 });

    const rail = body.querySelector('ul[aria-label="Recipient current care facts"]');
    expect(body.textContent).toContain('Recipient Care Journey');
    expect(body.textContent).not.toContain('Staff sign in');
    expect(body.textContent).not.toContain('Hospital Console');
    expect(rail).not.toBeNull();
    expect(rail.textContent).toContain('Current Match');
    expect(rail.textContent).toContain('Pending Hospital Demo Review');
    expect(rail.textContent).toContain('Blood requirement');
    expect(rail.textContent).toContain('Organ need');
    expect(rail.textContent).toContain('Urgency');
    expect(rail.textContent).toContain('A+');
    expect(rail.textContent).toContain('Kidney');
  });

  it('renders the Donor Care Journey Rail with current dynamic facts', async () => {
    mockSession = { id: 'citizen-1', role: 'citizen', displayName: 'Citizen Tester', serviceScope: ['blood'] };
    const body = renderApp(['/donor'], false);
    await vi.waitFor(() => expect(body.textContent).toContain('Donor Care Journey'), { timeout: 1000 });

    const rail = body.querySelector('ul[aria-label="Donor current care facts"]');
    expect(body.textContent).toContain('Donor Care Journey');
    expect(rail).not.toBeNull();
    expect(rail.textContent).toContain('Current Match');
    expect(rail.textContent).toContain('Pending Hospital Demo Review');
    expect(rail.textContent).toContain('Blood type');
    expect(rail.textContent).toContain('Pledged organs');
    expect(rail.textContent).toContain('Availability');
    expect(rail.textContent).toContain('O-');
    expect(rail.textContent).toContain('1');
  });

  it('redeems a named staff invitation and renders the Hospital Care Journey Rail', async () => {
    const body = renderApp(['/hospital-dashboard']);
    await vi.waitFor(() => expect(body.textContent).toContain('Staff Sign-In'));
    const username = body.querySelector('#staff-username');
    const password = body.querySelector('#staff-password');
    const mfa = body.querySelector('#staff-mfa-code');
    act(() => { setTestInputValue(username, 'ana.santos'); username.dispatchEvent(new Event('input', { bubbles: true })); setTestInputValue(password, 'correct-password'); password.dispatchEvent(new Event('input', { bubbles: true })); setTestInputValue(mfa, '123456'); mfa.dispatchEvent(new Event('input', { bubbles: true })); body.querySelector('form').requestSubmit(); });
    await vi.waitFor(() => expect(body.textContent).toContain('Hospital Care Journey'));

    const rail = body.querySelector('ul[aria-label="Hospital current care facts"]');
    expect(body.textContent).toContain('Hospital Care Journey');
    expect(rail).not.toBeNull();
    expect(rail.textContent).toContain('Pending review');
    expect(rail.textContent).toContain('Approved Matches');
    expect(rail.textContent).toContain('Active demo workflows');
    expect(rail.textContent).toContain('Consultations');
    expect(Array.from(rail.querySelectorAll('strong')).map((value) => value.textContent)).toEqual(['0', '0', '0', '0']);
    expect(body.textContent).not.toMatch(/Demo match [A-Z0-9-]+ approved|Recipient episode · Donor episode/i);
  });

  it('restores authorized staff, rejects citizen sessions, and logs out server-side', async () => {
    const body = renderApp(['/hospital-dashboard']);
    await vi.waitFor(() => expect(body.textContent).toContain('Staff Sign-In'));
    const username = body.querySelector('#staff-username');
    const password = body.querySelector('#staff-password');
    const mfa = body.querySelector('#staff-mfa-code');
    act(() => { setTestInputValue(username, 'ana.santos'); username.dispatchEvent(new Event('input', { bubbles: true })); setTestInputValue(password, 'correct-password'); password.dispatchEvent(new Event('input', { bubbles: true })); setTestInputValue(mfa, '123456'); mfa.dispatchEvent(new Event('input', { bubbles: true })); body.querySelector('form').requestSubmit(); });
    await vi.waitFor(() => expect(body.textContent).toContain('Hospital Demo Review'));
    expect(staffSignInBodies[0]).toMatchObject({ username: 'ana.santos', password: 'correct-password', mfaCode: '123456' });
    expect(staffSignInBodies[0]).not.toHaveProperty('role');
    expect(staffSignInBodies[0]).not.toHaveProperty('hospitalId');
    expect(staffSignInBodies[0]).not.toHaveProperty('serviceScope');
    expect(body.textContent).toContain('Dr. Ana Santos');

    act(() => root.unmount());
    root = undefined!;
    const reloadedBody = renderApp(['/hospital-dashboard'], false);
    await vi.waitFor(() => expect(reloadedBody.textContent).toContain('Hospital Demo Review'));

    act(() => reloadedBody.querySelector('button[aria-label="Sign out of hospital demo"]').click());
    await vi.waitFor(() => expect(reloadedBody.textContent).toContain('Staff Sign-In'));

    const citizenBody = renderApp(['/staff-sign-in']);
    const citizenUsername = citizenBody.querySelector('#staff-username');
    const citizenPassword = citizenBody.querySelector('#staff-password');
    const citizenMfa = citizenBody.querySelector('#staff-mfa-code');
    act(() => { setTestInputValue(citizenUsername, 'citizen'); citizenUsername.dispatchEvent(new Event('input', { bubbles: true })); setTestInputValue(citizenPassword, 'wrong'); citizenPassword.dispatchEvent(new Event('input', { bubbles: true })); setTestInputValue(citizenMfa, '000000'); citizenMfa.dispatchEvent(new Event('input', { bubbles: true })); citizenBody.querySelector('form').requestSubmit(); });
    await vi.waitFor(() => expect(citizenBody.textContent).toContain('We could not sign you in. Check your credentials and try again.'));
  });

  it('requires MFA before calling the staff sign-in endpoint', async () => {
    const body = renderApp(['/staff-sign-in']);
    await vi.waitFor(() => expect(body.textContent).toContain('Staff Sign-In'));
    const username = body.querySelector('#staff-username');
    const password = body.querySelector('#staff-password');
    act(() => { setTestInputValue(username, 'ana.santos'); username.dispatchEvent(new Event('input', { bubbles: true })); setTestInputValue(password, 'correct-password'); password.dispatchEvent(new Event('input', { bubbles: true })); body.querySelector('form').requestSubmit(); });
    expect((body.querySelector('#staff-mfa-code') as HTMLInputElement).validity.valueMissing).toBe(true);
    expect(staffSignInBodies).toHaveLength(0);
  });
});
