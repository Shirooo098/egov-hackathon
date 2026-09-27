// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
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

describe('eGovAI client response handling in FloatingAIChat', () => {
  it('renders provider answer correctly when res.data is a valid non-empty string', async () => {
    vi.spyOn(egovApi, 'askAI').mockResolvedValue({
      success: true,
      data: 'Official step-by-step coordination instructions.',
      informational: true,
    });

    const body = render(React.createElement(FloatingAIChat));
    const launcher = body.querySelector('button.floating-ai-launcher');
    act(() => (launcher as HTMLButtonElement).click());

    const choice = Array.from(body.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('How does eBuhay coordination work?')
    );
    expect(choice).not.toBeNull();

    await act(async () => {
      (choice as HTMLButtonElement).click();
    });

    expect(body.textContent).toContain('How does eBuhay coordination work?');
    expect(body.textContent).toContain('Official step-by-step coordination instructions.');
    expect(body.textContent).not.toContain('undefined');
    expect(body.textContent).not.toContain('[object Object]');
  });

  it('rejects undefined/missing data and displays unavailable retry message instead of undefined', async () => {
    // Simulate server returning unexpected shape with missing data
    vi.spyOn(egovApi, 'askAI').mockResolvedValue({
      success: true,
      data: undefined as unknown as string,
    });

    const body = render(React.createElement(FloatingAIChat));
    const launcher = body.querySelector('button.floating-ai-launcher');
    act(() => (launcher as HTMLButtonElement).click());

    const choice = Array.from(body.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('What are the steps to become a donor?')
    );
    expect(choice).not.toBeNull();

    await act(async () => {
      (choice as HTMLButtonElement).click();
    });

    expect(body.textContent).toContain('What are the steps to become a donor?');
    expect(body.textContent).toContain('The official eGovAI service is currently unavailable.');
    expect(body.textContent).not.toContain('undefined');
    expect(body.textContent).not.toContain('[object Object]');
  });

  it('rejects non-string object data and displays unavailable retry message instead of [object Object]', async () => {
    // Simulate server returning object inside data field
    vi.spyOn(egovApi, 'askAI').mockResolvedValue({
      success: true,
      data: { answer: 'bad-shape' } as unknown as string,
    });

    const body = render(React.createElement(FloatingAIChat));
    const launcher = body.querySelector('button.floating-ai-launcher');
    act(() => (launcher as HTMLButtonElement).click());

    const choice = Array.from(body.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('What are the steps to become a recipient?')
    );
    expect(choice).not.toBeNull();

    await act(async () => {
      (choice as HTMLButtonElement).click();
    });

    expect(body.textContent).toContain('The official eGovAI service is currently unavailable.');
    expect(body.textContent).not.toContain('[object Object]');
    expect(body.textContent).not.toContain('bad-shape');
  });

  it('displays unavailable retry message when egovApi.askAI throws 503', async () => {
    vi.spyOn(egovApi, 'askAI').mockRejectedValue(new Error('503 Service Unavailable'));

    const body = render(React.createElement(FloatingAIChat));
    const launcher = body.querySelector('button.floating-ai-launcher');
    act(() => (launcher as HTMLButtonElement).click());

    const choice = Array.from(body.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('How can I contact the coordination team?')
    );
    expect(choice).not.toBeNull();

    await act(async () => {
      (choice as HTMLButtonElement).click();
    });

    expect(body.textContent).toContain('How can I contact the coordination team?');
    expect(body.textContent).toContain('The official eGovAI service is currently unavailable.');
    expect(body.textContent).toContain('Please retry later.');
  });
});
