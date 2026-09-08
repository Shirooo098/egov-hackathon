import { afterEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import App from '../src/App.jsx';
import { ThemeProvider } from '../src/context/ThemeContext';
import { ToastProvider } from '../src/context/ToastContext';
import { MatchProvider } from '../src/context/MatchContext';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let root;

function renderApp(initialEntries = ['/'], clearSession = true) {
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
  root = undefined;
});

describe('top-level rendered routes', () => {
  it('presents the public Civic Care landing page', () => {
    const body = renderApp();

    expect(body.textContent).toContain('Connecting people, Donors, and care teams through one guided journey.');
    expect(body.textContent).toContain('eBuhay demo / prototype');
    expect(body.textContent).not.toContain('National platform secured with eGov Single Sign-On and Face Liveness verification.');
    expect(body.querySelector('a[href="/onboarding/recipient"]')).not.toBeNull();
    expect(body.querySelector('a[href="/onboarding/donor"]')).not.toBeNull();
    expect(body.textContent).toContain('Staff demo');
    expect(body.textContent).toContain('synthetic or simulated');
  });

  it('enters the existing focused onboarding flow without the mission hero', () => {
    const body = renderApp();
    act(() => body.querySelector('a[href="/onboarding/recipient"]').click());

    expect(body.textContent).toContain('Step 2 — Sign In or Sign Up');
    expect(body.textContent).not.toContain('Staff demo');
    expect(body.textContent).not.toContain('Connecting people, Donors, and care teams through one guided journey.');
  });

  it('enters the existing focused onboarding flow for Donors too', () => {
    const body = renderApp();
    act(() => body.querySelector('a[href="/onboarding/donor"]').click());

    expect(body.textContent).toContain('Step 2 — Sign In or Sign Up');
    expect(body.textContent).not.toContain('Staff demo');
    expect(body.textContent).not.toContain('Connecting people, Donors, and care teams through one guided journey.');
  });

  it('returns invalid onboarding roles and the first-screen Back action to landing', () => {
    const invalid = renderApp(['/onboarding/staff']);
    expect(invalid.textContent).toContain('A clearer path through transplant coordination');
    act(() => invalid.querySelector('a[href="/onboarding/recipient"]').click());
    act(() => invalid.querySelector('button').click());
    expect(invalid.textContent).toContain('A clearer path through transplant coordination');
    expect(invalid.textContent).not.toContain('Step 2 — Sign In or Sign Up');
  });

  it('renders the five compact landing blocks and illustrative status labels', () => {
    const body = renderApp();
    expect(body.querySelector('main')).not.toBeNull();
    expect(body.querySelector('#how-it-works')).not.toBeNull();
    expect(body.querySelector('#who-does-what')).not.toBeNull();
    expect(body.querySelector('#prototype-status')).not.toBeNull();
    expect(body.textContent).toContain('Illustrative prototype');
    expect(body.textContent).toContain('Ready when you are');
  });

  it('keeps the public landing available for an active citizen role', async () => {
    const body = renderApp();
    act(() => body.querySelector('a[href="/onboarding/recipient"]').click());
    await vi.waitFor(() => expect(body.textContent).toContain('Step 2 — Sign In or Sign Up'));
    act(() => [...body.querySelectorAll('button')].find((button) => button.textContent.includes('Sign In with eGov')).click());
    await vi.waitFor(() => expect(body.textContent).toContain('Quick Demo Sign-In'));
    act(() => [...body.querySelectorAll('button')].find((button) => button.textContent.includes('Quick Demo Sign-In')).click());
    await vi.waitFor(() => expect(body.textContent).toContain('Recipient Care Journey'));
    act(() => body.querySelector('.navbar-brand-link').click());
    await vi.waitFor(() => expect(body.textContent).toContain('Continue your journey'));
    expect(body.querySelector('a[href="/recipient"]')).not.toBeNull();
    expect(body.querySelector('a[href="/onboarding/recipient"]')).not.toBeNull();
    expect(body.querySelector('a[href="/onboarding/donor"]')).not.toBeNull();
  });

  it('renders the Recipient Care Journey Rail with current dynamic facts', async () => {
    const body = renderApp();
    act(() => body.querySelector('a[href="/onboarding/recipient"]').click());
    act(() => Array.from(body.querySelectorAll('button')).find(button => button.textContent.includes('Sign In with eGov')).click());
    await vi.waitFor(() => expect(body.textContent).toContain('Quick Demo Sign-In'));
    act(() => Array.from(body.querySelectorAll('button')).find(button => button.textContent.includes('Quick Demo Sign-In')).click());
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
    const body = renderApp();
    act(() => body.querySelector('a[href="/onboarding/donor"]').click());
    act(() => Array.from(body.querySelectorAll('button')).find(button => button.textContent.includes('Sign In with eGov')).click());
    await vi.waitFor(() => expect(body.textContent).toContain('Quick Demo Sign-In'));
    act(() => Array.from(body.querySelectorAll('button')).find(button => button.textContent.includes('Quick Demo Sign-In')).click());
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
    expect(rail.textContent).toContain('2');
  });

  it('renders the Hospital Care Journey Rail with pending review as the dominant value', async () => {
    const body = renderApp(['/hospital-dashboard']);
    act(() => body.querySelector('button[aria-label="Continue as PGH demo staff"]').click());
    await vi.waitFor(() => expect(body.textContent).toContain('Hospital Care Journey'));

    const rail = body.querySelector('ul[aria-label="Hospital current care facts"]');
    expect(body.textContent).toContain('Hospital Care Journey');
    expect(rail).not.toBeNull();
    expect(rail.textContent).toContain('Pending review');
    expect(rail.textContent).toContain('Approved Matches');
    expect(rail.textContent).toContain('Active demo workflows');
    expect(rail.textContent).toContain('Consultations');
    expect(Array.from(rail.querySelectorAll('strong')).map((value) => value.textContent)).toEqual(['2', '1', '0', '0']);
  });

  it('gates the hospital route behind the namespaced session and supports sign out', async () => {
    const body = renderApp(['/hospital-dashboard']);
    expect(body.textContent).toContain('Staff Sign-In');
    expect(body.textContent).not.toContain('Clinical Triage & Review');

    act(() => body.querySelector('button[aria-label="Continue as PGH demo staff"]').click());
    await vi.waitFor(() => expect(body.textContent).toContain('Hospital Demo Review'));
    expect(body.textContent).toContain('Hospital Demo Review');
    expect(sessionStorage.getItem('ebuhay:demo:hospital-session')).toBe('pgh-admin');

    act(() => root.unmount());
    root = undefined;
    const reloadedBody = renderApp(['/hospital-dashboard'], false);
    await vi.waitFor(() => expect(reloadedBody.textContent).toContain('Hospital Demo Review'));

    act(() => reloadedBody.querySelector('button[aria-label="Sign out of hospital demo"]').click());
    expect(reloadedBody.textContent).toContain('Staff Sign-In');
    expect(sessionStorage.getItem('ebuhay:demo:hospital-session')).toBeNull();
  });
});
