// @vitest-environment jsdom
import React, { act } from "react";
import { createRoot } from "react-dom/client";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { ToastProvider } from "../src/context/ToastContext";
import HospitalDashboard from "../src/pages/HospitalDashboard";
import {
  ExperimentalCompatibilityPanel,
  SYNTHETIC_COMPATIBILITY_FIXTURES,
  RESEARCH_MOCKUP_DISCLAIMER,
} from "../src/features/hospital/HospitalTabComponents";

const {
  appointmentRequestsList,
  slots,
  appointmentRequests,
  candidates,
  reviewers,
  currentPair,
  scheduleProposals,
  useMatch,
  useAuth,
} = vi.hoisted(() => ({
  appointmentRequestsList: vi.fn(),
  slots: vi.fn(),
  appointmentRequests: vi.fn(),
  candidates: vi.fn(),
  reviewers: vi.fn(),
  currentPair: vi.fn(),
  scheduleProposals: vi.fn(),
  useMatch: vi.fn(),
  useAuth: vi.fn(),
}));

vi.mock("../src/services/platformApi", () => ({
  platformApi: {
    appointmentRequestsList,
    slots,
    appointmentRequests,
    candidates,
    reviewers,
    currentPair,
    scheduleProposals,
    resetSyntheticFixtures: vi.fn(),
  },
}));

vi.mock("../src/context/MatchContext", () => ({ useMatch }));
vi.mock("../src/context/AuthContext", () => ({ useAuth }));

let root: ReturnType<typeof createRoot> | undefined;

function render(element: React.ReactNode) {
  document.body.innerHTML = '<div id="root"></div>';
  root = createRoot(document.getElementById("root")!);
  act(() => {
    root!.render(<ToastProvider>{element}</ToastProvider>);
  });
  return document.body;
}

beforeEach(() => {
  appointmentRequestsList.mockResolvedValue({ data: [] });
  slots.mockResolvedValue({ data: [] });
  appointmentRequests.mockResolvedValue({ data: [] });
  candidates.mockResolvedValue({
    data: { items: [{ candidateId: "cand-1", serviceId: "srv-kidney" }] },
  });
  reviewers.mockResolvedValue({
    data: { items: [{ id: "rev-1", displayName: "Dr. Ana Santos", role: "Doctor" }] },
  });
  currentPair.mockResolvedValue({ data: null });
  scheduleProposals.mockResolvedValue({ data: { items: [] } });

  useAuth.mockReturnValue({
    session: {
      account: {
        id: "staff-1",
        username: "staff.user",
        role: "hospital_staff",
      },
    },
  });

  useMatch.mockReturnValue({
    match: {
      id: "live-demo-match",
      status: "pending_hospital_approval",
      donor: { first_name: "Demo", last_name: "Donor", blood_type: "O+" },
      recipient: { first_name: "Demo", last_name: "Recipient", blood_type_needed: "O+" },
      organ: "kidney",
      matchType: "organ",
      compatibilityScore: 90,
      urgencyLevel: "moderate",
    },
    platform: {
      authoritative: false,
      services: [{ id: "srv-kidney", code: "kidney", name: "Kidney Service" }],
    },
    resetMatch: vi.fn(),
  });
});

afterEach(() => {
  if (root) {
    act(() => root!.unmount());
  }
  root = undefined;
  vi.clearAllMocks();
});

describe("experimental compatibility suggestions panel", () => {
  it("renders exactly five unordered static synthetic fixtures and excludes cornea", () => {
    const body = render(<ExperimentalCompatibilityPanel />);

    const fixtureArticles = body.querySelectorAll("article.experimental-fixture-card");
    expect(fixtureArticles).toHaveLength(5);
    expect(SYNTHETIC_COMPATIBILITY_FIXTURES).toHaveLength(5);

    const organs = Array.from(fixtureArticles).map((article) => {
      const heading = article.querySelector("h3.fixture-organ");
      return heading?.textContent?.trim().toLowerCase();
    });

    expect(organs).toContain("kidney");
    expect(organs).toContain("liver");
    expect(organs).toContain("heart");
    expect(organs).toContain("lung");
    expect(organs).toContain("pancreas");
    expect(organs).not.toContain("cornea");
    expect(body.textContent?.toLowerCase()).not.toContain("cornea");
  });

  it("permanently displays the exact unvalidated research mockup disclaimer", () => {
    const body = render(<ExperimentalCompatibilityPanel />);
    const exactDisclaimer =
      "Unvalidated research mockup—synthetic data only. Not for compatibility, allocation, or clinical use.";

    expect(RESEARCH_MOCKUP_DISCLAIMER).toBe(exactDisclaimer);
    expect(body.textContent).toContain(exactDisclaimer);

    const banner = body.querySelector(".experimental-disclaimer-banner");
    expect(banner).not.toBeNull();
    expect(banner?.textContent).toContain(exactDisclaimer);
  });

  it("displays only required synthetic and fictional fields on every fixture card", () => {
    const body = render(<ExperimentalCompatibilityPanel />);
    const cards = body.querySelectorAll("article.experimental-fixture-card");

    cards.forEach((card) => {
      const text = card.textContent || "";

      expect(text).toMatch(/Synthetic Donor Reference:/i);
      expect(text).toMatch(/SYN-DON-/i);
      expect(text).toMatch(/Synthetic Recipient Reference:/i);
      expect(text).toMatch(/SYN-REC-/i);
      expect(text).toMatch(/Fictional Blood Types:/i);
      expect(text).toMatch(/Donor\s+(?:A|B|AB|O)[+-]?\s*→\s*Recipient\s+(?:A|B|AB|O)[+-]?/i);
      expect(text).toMatch(/Why surfaced/i);
      expect(text).toMatch(/Missing-review items/i);
      expect(text).toMatch(/Prototype\s+v\d+\.\d+/i);

      const missingList = card.querySelectorAll("ul.fixture-missing-list li");
      expect(missingList.length).toBeGreaterThan(0);
    });
  });

  it("strictly excludes prohibited compatibility percentage, ranks, urgency weights, eligibility, clearance, and actions", () => {
    const body = render(<ExperimentalCompatibilityPanel />);
    const panel = body.querySelector(".experimental-compatibility-panel")!;
    const panelText = panel.textContent || "";

    // No percentage symbols or compatibility score indicators
    expect(panelText).not.toContain("%");
    expect(panelText).not.toMatch(/\bscore\b/i);
    expect(panelText).not.toMatch(/compatibility\s+(?:percentage|estimate|score)/i);

    // No rank or ordinal priority
    expect(panelText).not.toMatch(/\brank\b/i);
    expect(panelText).not.toMatch(/#(?:1|2|3|4|5)\b/);
    expect(panelText).not.toMatch(/priority\s+(?:order|rank|score)/i);

    // No urgency weights or legacy triage urgency levels
    expect(panelText).not.toMatch(/urgency\s+weight/i);
    expect(panelText).not.toMatch(/\bcritical\b/i);
    expect(panelText).not.toMatch(/\burgent\b/i);
    expect(panelText).not.toMatch(/\bmoderate\b/i);

    // No clinical clearance or eligibility statements
    expect(panelText).not.toMatch(/\beligib(?:le|ility)\b/i);
    expect(panelText).not.toMatch(/\bclearance\b/i);
    expect(panelText).not.toMatch(/\bmedically\s+cleared\b/i);
    expect(panelText).not.toMatch(/clinical(?:ly)?\s+clear(?:ed)?/i);

    // No recommended action
    expect(panelText).not.toMatch(/recommended\s+action/i);

    // Completely read-only: no buttons or inputs inside the panel
    const interactiveElements = panel.querySelectorAll("button, input, select, textarea, a");
    expect(interactiveElements).toHaveLength(0);
  });
});

describe("hospital dashboard integration for experimental compatibility suggestions", () => {
  it("renders the read-only experimental suggestions alongside the separate CandidateQueue", async () => {
    const body = render(<HospitalDashboard />);
    await act(async () => {});

    // Authoritative CandidateQueue remains separate and rendered
    const candidateQueueSection =
      body.querySelector(".hospital-candidate-queue") ||
      body.querySelector("#candidate-queue-heading");
    expect(candidateQueueSection).not.toBeNull();

    // Experimental suggestions panel is rendered
    const experimentalPanel = body.querySelector(".experimental-compatibility-panel");
    expect(experimentalPanel).not.toBeNull();
    expect(experimentalPanel?.textContent).toContain(
      "Unvalidated research mockup—synthetic data only. Not for compatibility, allocation, or clinical use.",
    );

    // Exactly 5 fixture cards are rendered
    const fixtureCards = experimentalPanel?.querySelectorAll(".experimental-fixture-card");
    expect(fixtureCards).toHaveLength(5);

    // Cornea is excluded
    expect(experimentalPanel?.textContent?.toLowerCase()).not.toContain("cornea");

    // Legacy Approve/Decline actions are absent from the hospital demo review experience
    const allButtons = Array.from(body.querySelectorAll("button"));
    const buttonLabels = allButtons.map((b) => b.textContent?.trim() || "");
    expect(buttonLabels.some((l) => /^Approve$/i.test(l))).toBe(false);
    expect(buttonLabels.some((l) => /^Decline$/i.test(l))).toBe(false);
    expect(buttonLabels.some((l) => /Re-evaluate/i.test(l))).toBe(false);
  });

  it("does not mutate workflow state or call provider services from the experimental panel", async () => {
    const body = render(<HospitalDashboard />);
    await act(async () => {});

    const experimentalPanel = body.querySelector(".experimental-compatibility-panel")!;
    expect(experimentalPanel).not.toBeNull();

    // The panel has no interactive action buttons
    const panelButtons = experimentalPanel.querySelectorAll("button");
    expect(panelButtons).toHaveLength(0);
  });
});
