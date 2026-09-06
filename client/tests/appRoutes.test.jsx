import { afterEach, describe, expect, it } from 'vitest';
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
  it('presents only citizen choices in a mission-led opening', () => {
    const body = renderApp();

    expect(body.textContent).toContain('Connecting people, Donors, and care teams through one guided journey.');
    expect(body.textContent).toContain('eBuhay demo / prototype');
    expect(body.textContent).not.toContain('National platform secured with eGov Single Sign-On and Face Liveness verification.');
    expect(body.querySelector('button[aria-label="Recipient"]')).not.toBeNull();
    expect(body.querySelector('button[aria-label="Donor"]')).not.toBeNull();
    expect(body.textContent).toContain('Staff sign in');
    expect(body.textContent).not.toContain('Hospital');
    expect(body.textContent).not.toContain('Doctor');
  });

  it('enters the existing focused onboarding flow without the mission hero', () => {
    const body = renderApp();
    act(() => body.querySelector('button[aria-label="Recipient"]').click());

    expect(body.textContent).toContain('Step 2 — Sign In or Sign Up');
    expect(body.textContent).not.toContain('Staff sign in');
    expect(body.textContent).not.toContain('Connecting people, Donors, and care teams through one guided journey.');
  });

  it('enters the existing focused onboarding flow for Donors too', () => {
    const body = renderApp();
    act(() => body.querySelector('button[aria-label="Donor"]').click());

    expect(body.textContent).toContain('Step 2 — Sign In or Sign Up');
    expect(body.textContent).not.toContain('Staff sign in');
    expect(body.textContent).not.toContain('Connecting people, Donors, and care teams through one guided journey.');
  });

  it('renders the Recipient Care Journey Rail with current dynamic facts', async () => {
    const body = renderApp();
    act(() => body.querySelector('button[aria-label="Recipient"]').click());
    act(() => Array.from(body.querySelectorAll('button')).find(button => button.textContent.includes('Sign In with eGov')).click());
    act(() => Array.from(body.querySelectorAll('button')).find(button => button.textContent.includes('Quick Demo Sign-In')).click());
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 650)); });

    const rail = body.querySelector('ul[aria-label="Recipient current care facts"]');
    expect(body.textContent).toContain('Recipient Care Journey');
    expect(body.textContent).not.toContain('Staff sign in');
    expect(body.textContent).not.toContain('Hospital Console');
    expect(rail).not.toBeNull();
    expect(rail.textContent).toContain('Current Match');
    expect(rail.textContent).toContain('Pending Hospital Approval');
    expect(rail.textContent).toContain('Blood requirement');
    expect(rail.textContent).toContain('Organ need');
    expect(rail.textContent).toContain('Urgency');
    expect(rail.textContent).toContain('A+');
    expect(rail.textContent).toContain('Kidney');
  });

  it('renders the Donor Care Journey Rail with current dynamic facts', async () => {
    const body = renderApp();
    act(() => body.querySelector('button[aria-label="Donor"]').click());
    act(() => Array.from(body.querySelectorAll('button')).find(button => button.textContent.includes('Sign In with eGov')).click());
    act(() => Array.from(body.querySelectorAll('button')).find(button => button.textContent.includes('Quick Demo Sign-In')).click());
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 650)); });

    const rail = body.querySelector('ul[aria-label="Donor current care facts"]');
    expect(body.textContent).toContain('Donor Care Journey');
    expect(rail).not.toBeNull();
    expect(rail.textContent).toContain('Current Match');
    expect(rail.textContent).toContain('Pending Hospital Approval');
    expect(rail.textContent).toContain('Blood type');
    expect(rail.textContent).toContain('Pledged organs');
    expect(rail.textContent).toContain('Availability');
    expect(rail.textContent).toContain('O-');
    expect(rail.textContent).toContain('2');
  });

  it('renders the Hospital Care Journey Rail with pending review as the dominant value', () => {
    const body = renderApp(['/hospital-dashboard']);
    act(() => body.querySelector('button[aria-label="Continue as PGH demo staff"]').click());

    const rail = body.querySelector('ul[aria-label="Hospital current care facts"]');
    expect(body.textContent).toContain('Hospital Care Journey');
    expect(rail).not.toBeNull();
    expect(rail.textContent).toContain('Pending review');
    expect(rail.textContent).toContain('Approved Matches');
    expect(rail.textContent).toContain('Active procedures');
    expect(rail.textContent).toContain('Consultations');
    expect(Array.from(rail.querySelectorAll('strong')).map((value) => value.textContent)).toEqual(['2', '1', '0', '0']);
  });

  it('gates the hospital route behind the namespaced session and supports sign out', () => {
    const body = renderApp(['/hospital-dashboard']);
    expect(body.textContent).toContain('Staff Sign-In');
    expect(body.textContent).not.toContain('Clinical Triage & Review');

    act(() => body.querySelector('button[aria-label="Continue as PGH demo staff"]').click());
    expect(body.textContent).toContain('Clinical Triage & Review');
    expect(sessionStorage.getItem('ebuhay:demo:hospital-session')).toBe('pgh-admin');

    act(() => root.unmount());
    root = undefined;
    const reloadedBody = renderApp(['/hospital-dashboard'], false);
    expect(reloadedBody.textContent).toContain('Clinical Triage & Review');

    act(() => reloadedBody.querySelector('button[aria-label="Sign out of hospital demo"]').click());
    expect(reloadedBody.textContent).toContain('Staff Sign-In');
    expect(sessionStorage.getItem('ebuhay:demo:hospital-session')).toBeNull();
  });
});
