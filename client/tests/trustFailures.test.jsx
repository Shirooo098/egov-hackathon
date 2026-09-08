import React from 'react';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/services/api', () => ({
  api: { anchorConsent: vi.fn(), sendSms: vi.fn() },
}));

import { api } from '../src/services/api';
import { MatchProvider, useMatch } from '../src/context/MatchContext.jsx';
import { ToastProvider } from '../src/context/ToastContext.jsx';
import RecipientDashboard from '../src/pages/RecipientDashboard.jsx';
import DonorDashboard from '../src/pages/DonorDashboard.jsx';
import HospitalDashboard from '../src/pages/HospitalDashboard.jsx';
import ChatBox from '../src/features/match/ChatBox.jsx';
import MatchReviewModal from '../src/features/match/MatchReviewModal.jsx';
import App from '../src/App.jsx';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from '../src/context/ThemeContext';

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let root;
const render = (element) => {
  document.body.innerHTML = '<div id="root"></div>';
  root = createRoot(document.getElementById('root'));
  act(() => root.render(element));
  return document.body;
};

afterEach(() => {
  act(() => root?.unmount());
  root = undefined;
  vi.clearAllMocks();
  localStorage.clear();
});

describe('trust-bearing failure states', () => {
  it('labels landing as synthetic intended-pilot and discloses safety limits', () => {
    const body = render(<ThemeProvider><ToastProvider><MemoryRouter><MatchProvider><App /></MatchProvider></MemoryRouter></ToastProvider></ThemeProvider>);
    expect(body.textContent).toContain('intended-pilot');
    expect(body.textContent).toContain('synthetic or simulated');
    expect(body.textContent).toContain('does not provide clinical clearance');
    expect(body.textContent).toContain('live identity');
    expect(body.textContent).toContain('automatically match');
    expect(body.textContent).toContain('eligibility');
    expect(body.textContent).toContain('compatibility');
    expect(body.textContent).toContain('confirmed hospital integration');
    expect(body.textContent).toContain('not emergency care or medical advice');
    expect(body.textContent).not.toContain('automatic matching');
    expect(body.textContent).not.toContain('government identity was verified');
  });
  it('does not create an anchor or advance the match when background anchoring fails', async () => {
    api.anchorConsent.mockRejectedValue(new Error('Network unavailable'));
    let controls;
    function Probe() {
      controls = useMatch();
      return <output data-testid="status">{controls.match.status}</output>;
    }
    const body = render(<ToastProvider><MatchProvider><Probe /></MatchProvider></ToastProvider>);

    await act(async () => {
      await controls.anchorToBlockchain();
    });

    expect(body.querySelector('[data-testid="status"]').textContent).toBe('pending_hospital_approval');
    expect(controls.match.blockchainAnchor).toBeNull();
  });

  it('does not send SMS when citizen dashboards mount', () => {
    render(
      <ToastProvider>
        <MatchProvider>
          <RecipientDashboard />
          <DonorDashboard />
        </MatchProvider>
      </ToastProvider>
    );

    expect(api.sendSms).not.toHaveBeenCalled();
  });

  it('does not treat a doctor approval prop as hospital demo review', () => {
    const body = render(<ToastProvider><ChatBox doctorApproved hospitalApproved={false} /></ToastProvider>);
    expect(body.textContent).toContain('Waiting for hospital review');
    act(() => root.unmount());
    root = undefined;

    const modal = render(<MatchReviewModal match={{}} role="recipient" doctorApproved hospitalApproved={false} onClose={() => {}} onAcceptChat={() => {}} />);
    const buttonNames = [...modal.querySelectorAll('button')].map(button => `${button.getAttribute('aria-label') || ''} ${button.textContent}`);
    expect(buttonNames.some(name => /accept(?:\s*&\s*chat)?/i.test(name))).toBe(false);
  });

  it.each([
    ['recipient', RecipientDashboard, 'My Match'],
    ['donor', DonorDashboard, 'My Match'],
    ['hospital', HospitalDashboard, 'Hospital Demo Review'],
  ])('exposes the current %s dashboard tab', (_role, Dashboard, label) => {
    const body = render(<ToastProvider><MatchProvider><Dashboard /></MatchProvider></ToastProvider>);
    const current = [...body.querySelectorAll('button[aria-pressed="true"]')].find(button => button.getAttribute('aria-label') === label);
    expect(current).toBeTruthy();
  });
});
