// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import FaceLivenessCheck from '../src/features/onboarding/FaceLivenessCheck';
import { FindDonorsStep } from '../src/features/recipient/RecipientStepComponents';
import FloatingAIChat from '../src/components/ui/FloatingAIChat';
import { egovApi } from '../src/services/egovApi';

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
  vi.restoreAllMocks();
});

describe('Issue 02: FaceLivenessCheck user surface', () => {
  it('renders unavailable label, capability deferred badge, and does not claim verification', () => {
    const onBack = vi.fn();
    const body = render(
      <FaceLivenessCheck
        livenessMessage="Official Face Liveness service is deferred and unavailable. Please retry later after official integration is verified."
        onBack={onBack}
      />
    );

    expect(body.textContent).toContain('Face Liveness Check — Unavailable');
    expect(body.textContent).toContain('Capability Deferred (503)');
    expect(body.textContent).toContain('deferred pending verified official provider contracts');
    expect(body.textContent).not.toContain('Demo face check complete');
    expect(body.textContent).not.toContain('PASS');
    expect(body.querySelector('[aria-label="Onboarding progress"]')).toBeNull();

    const backBtn = body.querySelector('button');
    expect(backBtn).not.toBeNull();
    act(() => backBtn!.click());
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});

describe('Issue 02: donor match identity surface', () => {
  it('renders synthetic donor matches without eVerify or identity-status badges', () => {
    const body = render(
      <FindDonorsStep
        params={{ request_type: 'organ', blood_type_needed: 'A+', organ_needed: 'kidney' }}
        loading={false}
        findMatches={vi.fn()}
        matches={[{
          donor: {
            id: 'syn-donor-001',
            blood_type: 'O-',
            first_name: 'Juan',
            last_name: 'Dela Cruz',
            location_city: 'Quezon City',
            donor_profile: { organ_pledges: ['kidney'] },
          },
          compatibilityScore: 98,
        }]}
        consentSigned={false}
        handleMatch={vi.fn()}
      />,
    );

    expect(body.textContent).toContain('Anonymous Donor #SYN-');
    expect(body.textContent).toContain('ABO / Rh sample match');
    expect(body.textContent).not.toMatch(/e-?verify|demo identity|identity[- ]not[- ]verified|PhilSys|PCN/i);
  });
});

describe('Issue 05 and 06: FloatingAIChat informational and unavailable guidance', () => {
  it('renders visible informational disclaimer label and unavailable status', () => {
    const body = render(<FloatingAIChat />);

    // Open chat
    const launcher = body.querySelector('button.floating-ai-launcher');
    expect(launcher).not.toBeNull();
    act(() => (launcher as HTMLButtonElement).click());

    expect(body.textContent).toContain('eGovAI Guidance');
    expect(body.textContent).toContain('Service unavailable (503)');
    expect(body.textContent).toContain('Informational guidance only');
    expect(body.textContent).toContain('Excludes clinical, legal, eligibility, matching, or scheduling advice');
    expect(body.textContent).toContain('Welcome to eGovAI guidance');
  });

  it('offers only fixed public process choices and fails closed on send error', async () => {
    vi.spyOn(egovApi, 'askAI').mockRejectedValue(new Error('503 Service Unavailable'));

    const body = render(<FloatingAIChat />);
    const launcher = body.querySelector('button.floating-ai-launcher');
    act(() => (launcher as HTMLButtonElement).click());

    expect(body.querySelector('textarea')).toBeNull();
    const choice = Array.from(body.querySelectorAll('button')).find((button) =>
      button.textContent?.includes('How does eBuhay coordination work?'),
    );
    expect(choice).not.toBeNull();
    await act(async () => {
      (choice as HTMLButtonElement).click();
    });

    expect(body.textContent).toContain('How does eBuhay coordination work?');
    expect(body.textContent).toContain('The official eGovAI service is currently unavailable or deferred (503)');
    expect(body.textContent).not.toContain('Republic Act');
    expect(body.textContent).not.toContain('eGovAI Legal Advisory');
  });
});
