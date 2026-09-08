import { act } from 'react';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it, vi } from 'vitest';
import { MemoryRouter, useLocation } from 'react-router-dom';
import App from '../src/App.jsx';
import { ThemeProvider } from '../src/context/ThemeContext';
import { ToastProvider } from '../src/context/ToastContext';
import { MatchProvider } from '../src/context/MatchContext';
import MatchReviewModal from '../src/features/match/MatchReviewModal';
import RecipientHealthForm from '../src/features/recipient/RecipientHealthForm';
import EgovSsoForm from '../src/features/onboarding/EgovSsoForm';
import SignatureUploader from '../src/features/match/SignatureUploader';
import FloatingAIChat from '../src/components/ui/FloatingAIChat';
import { DonorProfileTab } from '../src/features/donor/DonorTabComponents';

function mount(element) {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = createRoot(host);
  act(() => root.render(element));
  return { host, root };
}

function LocationProbe() {
  return <output data-testid="location">{useLocation().pathname}</output>;
}

describe('accessibility hardening', () => {
  it('exposes landing landmarks, named controls, fragment targets, and one h1', () => {
    const { host, root } = mount(<ThemeProvider><ToastProvider><MemoryRouter><MatchProvider><App /></MatchProvider></MemoryRouter></ToastProvider></ThemeProvider>);
    expect(host.querySelector('header nav')).toBeTruthy();
    expect(host.querySelector('main')).toBeTruthy();
    expect(host.querySelector('footer')).toBeTruthy();
    expect(host.querySelectorAll('h1')).toHaveLength(1);
    for (const link of host.querySelectorAll('header nav a[href^="#"]')) expect(host.querySelector(link.getAttribute('href'))).toBeTruthy();
    expect(host.querySelector('a[href="/onboarding/recipient"]')).toBeTruthy();
    act(() => root.unmount());
  });

  it('retains focus for fragments and moves focus across landing/onboarding boundaries', async () => {
    const { host, root } = mount(<ThemeProvider><ToastProvider><MemoryRouter><MatchProvider><App /><LocationProbe /></MatchProvider></MemoryRouter></ToastProvider></ThemeProvider>);
    const fragment = host.querySelector('a[href="#how-it-works"]');
    act(() => fragment.click());
    expect(document.activeElement).toBe(fragment);
    act(() => host.querySelector('a[href="/onboarding/recipient"]').click());
    await vi.waitFor(() => expect(document.activeElement?.id).toBe('onboarding-heading'));
    act(() => [...host.querySelectorAll('button')].find((button) => button.textContent.trim() === 'Change').click());
    await vi.waitFor(() => expect(host.querySelector('[data-testid="location"]').textContent).toBe('/'));
    expect(document.activeElement?.id).toBe('landing-heading');
    act(() => root.unmount());
  });
  it('renders labelled controls in onboarding forms', () => {
    const { host, root } = mount(
      <RecipientHealthForm
        recipientHealth={{ request_type: 'blood', blood_type_needed: 'O+', urgency_level: 'moderate', dialysis: 'no', conditions: '', hasMedicalRecord: 'no', appointmentDate: '', appointmentTime: '', signatureFile: null }}
        setRecipientHealth={() => {}}
        onSubmit={() => {}}
        onBack={() => {}}
      />,
    );
    for (const control of host.querySelectorAll('select, textarea, input:not([type="file"])')) {
      expect(control.id).toBeTruthy();
      expect(host.querySelector(`label[for="${control.id}"]`)).toBeTruthy();
    }
    act(() => root.unmount());
  });

  it('implements dialog semantics, focus management, escape, and tab containment', () => {
    const onClose = vi.fn();
    const opener = document.createElement('button');
    document.body.appendChild(opener);
    opener.focus();
    const { host, root } = mount(<MatchReviewModal match={{}} role="recipient" onClose={onClose} />);
    const dialog = host.querySelector('[role="dialog"]');
    expect(dialog?.getAttribute('aria-modal')).toBe('true');
    expect(dialog?.getAttribute('aria-labelledby')).toBeTruthy();
    expect(host.querySelector('button[aria-label="Close match compatibility review"]')).toBeTruthy();
    expect(document.activeElement).toBe(host.querySelector('button[aria-label="Close match compatibility review"]'));
    const buttons = [...dialog.querySelectorAll('button:not([disabled])')];
    buttons.at(-1).focus();
    act(() => buttons.at(-1).dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true })));
    expect(document.activeElement).toBe(buttons[0]);
    act(() => dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })));
    expect(onClose).toHaveBeenCalledTimes(1);
    act(() => root.unmount());
    expect(document.activeElement).toBe(opener);
  });

  it('associates the eGov exchange code label', () => {
    const { host, root } = mount(<EgovSsoForm exchangeCode="" setExchangeCode={() => {}} onSubmit={() => {}} pendingRole="recipient" authMode="signin" />);
    const input = host.querySelector('input');
    expect(input.id).toBeTruthy();
    expect(host.querySelector(`label[for="${input.id}"]`)).toBeTruthy();
    act(() => root.unmount());
  });

  it('opens the file picker from a keyboard-focusable upload button', () => {
    const inputClick = vi.spyOn(HTMLInputElement.prototype, 'click');
    const { host, root } = mount(<SignatureUploader />);
    const trigger = host.querySelector('button[aria-label="Upload E-Signature. Supports PNG, JPG, or PDF (max 5MB)"]');
    expect(trigger).toBeTruthy();
    act(() => trigger.click());
    expect(inputClick).toHaveBeenCalledTimes(1);
    inputClick.mockRestore();
    act(() => root.unmount());
  });

  it('gives the floating assistant dialog focus and returns focus on Escape', async () => {
    const { host, root } = mount(<FloatingAIChat />);
    const launcher = host.querySelector('.floating-ai-launcher');
    expect(launcher.getAttribute('aria-haspopup')).toBe('dialog');
    expect(launcher.getAttribute('aria-expanded')).toBe('false');
    act(() => launcher.click());
    expect(launcher.getAttribute('aria-expanded')).toBe('true');
    expect(host.querySelector('[role="dialog"]').getAttribute('aria-labelledby')).toBe('floating-ai-chat-title');
    expect(document.activeElement).toBe(host.querySelector('textarea[aria-label="AI chat message input"]'));
    act(() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })));
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 0)); });
    expect(document.activeElement).toBe(launcher);
    expect(host.querySelector('[role="dialog"]')).toBeNull();
    act(() => launcher.click());
    const closeButton = host.querySelector('button[aria-label="Close chat"]');
    act(() => closeButton.click());
    expect(document.activeElement).toBe(launcher);
    act(() => root.unmount());
  });

  it('cleans up an in-flight signature upload on unmount', () => {
    vi.useFakeTimers();
    const onUploadComplete = vi.fn();
    const { host, root } = mount(<SignatureUploader onUploadComplete={onUploadComplete} />);
    const input = host.querySelector('input[type="file"]');
    const file = new File(['demo'], 'signature.png', { type: 'image/png' });
    act(() => {
      Object.defineProperty(input, 'files', { value: [file], configurable: true });
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });
    act(() => root.unmount());
    act(() => { vi.advanceTimersByTime(2000); });
    expect(onUploadComplete).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('does not leave orphan labels in the donor profile', () => {
    const { host, root } = mount(
      <DonorProfileTab
        avail
        setAvail={() => {}}
        bloodType="O+"
        setBloodType={() => {}}
        isBlood
        setIsBlood={() => {}}
        organs={[]}
        toggleOrgan={() => {}}
        saveProfile={() => {}}
        BLOOD_TYPES={['O+']}
        ALL_ORGANS={[]}
      />,
    );
    for (const label of host.querySelectorAll('label')) {
      const controlId = label.getAttribute('for');
      expect(controlId).toBeTruthy();
      expect(host.querySelector(`#${controlId}`)).toBeTruthy();
    }
    act(() => root.unmount());
  });
});
