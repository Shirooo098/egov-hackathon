import { afterEach, describe, expect, it, vi } from 'vitest';
import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter, useLocation, useNavigate } from 'react-router-dom';
import App from '../src/App.jsx';
import { ThemeProvider } from '../src/context/ThemeContext';
import { ToastProvider } from '../src/context/ToastContext';
import { MatchProvider } from '../src/context/MatchContext';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let root;

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

function renderApp(initialEntries = ['/']) {
  sessionStorage.clear();
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
  root = undefined;
});

async function enterDemoRole(role) {
  const body = renderApp();
  act(() => body.querySelector(`button[aria-label="${role[0].toUpperCase()}${role.slice(1)}"]`).click());
  act(() => Array.from(body.querySelectorAll('button')).find((button) => button.textContent.includes('Sign In with eGov')).click());
  await vi.waitFor(() => expect(body.textContent).toContain('Quick Demo Sign-In'));
  act(() => Array.from(body.querySelectorAll('button')).find((button) => button.textContent.includes('Quick Demo Sign-In')).click());
  await vi.waitFor(() => expect(body.querySelector('[data-testid="location"]')?.textContent).toBe(`/${role}`), { timeout: 1500 });
  return body;
}

describe('citizen dashboard routing', () => {
  // Catches demo sign-in setting role without replacing the public URL.
  it('navigates a recipient demo sign-in to /recipient', async () => {
    await enterDemoRole('recipient');
  });

  // Catches donor onboarding using a recipient or root canonical route.
  it('navigates a donor demo sign-in to /donor', async () => {
    await enterDemoRole('donor');
  });

  // Catches a signed-in Recipient being allowed to mount the Donor dashboard.
  it('redirects a signed-in Recipient away from the Donor route', async () => {
    const body = await enterDemoRole('recipient');
    act(() => body.querySelector('[data-testid="navigate-donor"]').click());
    await vi.waitFor(() => expect(body.querySelector('[data-testid="location"]')?.textContent).toBe('/recipient'));
    expect(body.textContent).not.toContain('Donor Care Journey');
  });

  // Catches role routes rendering before an in-memory role guard runs.
  it.each(['/recipient', '/donor'])('redirects a direct unauthenticated %s route to public onboarding', async (route) => {
    const body = renderApp([route]);
    await vi.waitFor(() => expect(body.querySelector('[data-testid="location"]')?.textContent).toBe('/'));
    expect(body.textContent).toContain('Connecting people, Donors, and care teams through one guided journey.');
  });

  // Catches sign-out clearing state without navigating away from the protected route.
  it('returns to public onboarding after citizen sign-out', async () => {
    const body = await enterDemoRole('recipient');
    act(() => Array.from(body.querySelectorAll('button')).find((button) => button.textContent.includes('Exit Role')).click());
    await vi.waitFor(() => expect(body.querySelector('[data-testid="location"]')?.textContent).toBe('/'));
    expect(body.textContent).toContain('Connecting people, Donors, and care teams through one guided journey.');
  });
});
