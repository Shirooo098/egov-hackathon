import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useEffect,
  useRef,
} from "react";
import { useToast } from "./ToastContext";
import { useAuth } from "./AuthContext";
import { api } from "../services/api";
import { platformApi } from "../services/platformApi";
import { eMessageToast } from "../utils/eMessageToast";
import { getRuntimeMode, isLegacyDemoWorkflowEnabled } from "../services/runtimeMode";
import {
  INITIAL_DEMO_MATCH,
  MATCH_STORAGE_KEY,
  getInitialMatch,
  saveMatchToStorage,
  clearMatchFromStorage,
  clearStaticMatchesFromStorage,
  parseStorageEventValue,
  calculateUpdatedMatchFromProfile,
  type MatchRecord,
  type ProfileFields,
} from "./matchHelpers";

type PlatformCase = {
  id?: string;
  caseId?: string;
  episodeId?: string;
  role?: string;
  serviceId?: string;
  serviceCode?: string;
  service?: { code?: string };
  [key: string]: unknown;
};
type PlatformService = {
  id?: string;
  code?: string;
  hospitalId?: string;
  [key: string]: unknown;
};
type PlatformState = {
  loading: boolean;
  authoritative: boolean;
  services: PlatformService[];
  cases: PlatformCase[];
  intakes: Record<string, Record<string, unknown>>;
  bookings: unknown[];
  notifications: unknown[];
  currentPair: Record<string, unknown> | null;
};
interface MatchContextValue {
  match: MatchRecord;
  advanceStatus: (status: string) => void;
  proposeSchedule: (schedule: {
    date: string;
    time?: string;
    location?: string;
    proposedBy: string;
  }) => void;
  setScheduledDate: (date: string, time?: string, location?: string) => void;
  signAgreement: (role: "donor" | "recipient") => void;
  anchorToBlockchain: (data?: unknown) => Promise<unknown>;
  setConsentSigned: (value: boolean) => void;
  resetMatch: () => void;
  updateMatchFromProfile: (
    role: "donor" | "recipient",
    fields: ProfileFields,
  ) => unknown;
  isApproved: boolean;
  hospitalApproved: boolean;
  consentSigned: boolean;
  isAgreementFinalized: boolean;
  agreementSigned: boolean;
  platform: PlatformState;
  currentPair: Record<string, unknown> | null;
  saveIntake: (
    role: string,
    payload: Record<string, unknown>,
  ) => Promise<unknown>;
}
const MatchContext = createContext<MatchContextValue | null>(null);

export function MatchProvider({ children }: { children: React.ReactNode }) {
  const auth = useAuth(true);
  const legacyDemoWorkflowEnabled = isLegacyDemoWorkflowEnabled(getRuntimeMode());
  const accountId =
    typeof auth?.session?.account?.id === "string"
      ? auth.session.account.id
      : null;
  const accountGeneration = useRef(0);
  const previousAccountId = useRef(accountId);
  if (previousAccountId.current !== accountId) {
    previousAccountId.current = accountId;
    accountGeneration.current += 1;
  }
  const [match, setMatch] = useState<MatchRecord>(() =>
    legacyDemoWorkflowEnabled ? getInitialMatch() : INITIAL_DEMO_MATCH,
  );
  const [platform, setPlatform] = useState<PlatformState>({
    loading: true,
    authoritative: false,
    services: [],
    cases: [],
    intakes: {},
    bookings: [],
    notifications: [],
    currentPair: null,
  });
  const toast = useToast();

  useEffect(() => {
    setMatch(legacyDemoWorkflowEnabled ? getInitialMatch() : INITIAL_DEMO_MATCH);
  }, [accountId, legacyDemoWorkflowEnabled]);

  useEffect(() => {
    setPlatform((previous) => ({
      ...previous,
      loading:
        auth?.status === "authenticated" || Boolean(auth && !auth.restored),
      authoritative: false,
      cases: [],
      intakes: {},
      bookings: [],
      notifications: [],
      currentPair: null,
    }));
    if (!auth || !auth.restored || auth.status !== "authenticated") {
      return undefined;
    }
    let cancelled = false;
    Promise.allSettled([
      platformApi.services(),
      platformApi.cases(),
      platformApi.bookings(),
      platformApi.notifications(),
      platformApi.currentPair(),
    ])
      .then(
        async ([
          servicesResult,
          casesResult,
          bookingsResult,
          notificationsResult,
          currentPairResult,
        ]) => {
          if (cancelled) return;
          const value = (
            result: PromiseSettledResult<Record<string, unknown>>,
            fallback: unknown[] = [],
          ) =>
            result.status === "fulfilled"
              ? Array.isArray(result.value.data)
                ? result.value.data
                : fallback
              : fallback;
          const services = value(servicesResult);
          const cases = value(casesResult);
          const intakeResults = await Promise.all(
            cases
              .filter((item: PlatformCase) => item.episodeId)
              .map(
                async (item: PlatformCase) =>
                  [
                    item.episodeId as string,
                    (await platformApi.intake(item.episodeId as string))
                      .data as Record<string, unknown>,
                  ] as const,
              ),
          );
          if (cancelled) return;
          const currentPair =
            currentPairResult.status === "fulfilled" &&
            currentPairResult.value.data &&
            typeof currentPairResult.value.data === "object"
              ? (currentPairResult.value.data as Record<string, unknown>)
              : null;
            setPlatform({
              loading: false,
              authoritative:
                servicesResult.status === "fulfilled" &&
                casesResult.status === "fulfilled",
            services: services as PlatformService[],
            cases: cases as PlatformCase[],
            intakes: Object.fromEntries(
              intakeResults.filter(([, intake]) => intake),
            ),
            bookings: value(bookingsResult),
            notifications: value(notificationsResult),
            currentPair,
          });
        },
      )
      .catch(() => {
        if (!cancelled)
          setPlatform((previous) => ({ ...previous, loading: false }));
      });
    return () => {
      cancelled = true;
    };
  }, [auth?.restored, auth?.status, accountId]);

  const saveIntake = useCallback(
    async (role: string, payload: Record<string, unknown>) => {
      const requestGeneration = accountGeneration.current;
      const requestAccountId = accountId;
      const currentRequest = () =>
        requestGeneration === accountGeneration.current &&
        requestAccountId === accountId;
      const requestedCode =
        payload.serviceCode ||
        (role === "recipient"
          ? payload.requestType === "blood"
            ? "blood"
            : "kidney"
          : payload.bloodDonor
            ? "blood"
            : "kidney");
      const requestedServiceId = payload.serviceId;
      const service = platform.services.find((item) =>
        requestedServiceId
          ? item.id === requestedServiceId
          : item.code === requestedCode,
      );
      const currentCase = platform.cases.find((item) => {
        if (item.role !== role || !item.episodeId) return false;
        if (requestedServiceId) return item.serviceId === requestedServiceId;
        return (
          item.serviceId === service?.id ||
          item.serviceCode === requestedCode ||
          item.service?.code === requestedCode
        );
      });
      let target = currentCase;
      if (!target) {
        if (!service?.id)
          throw new Error("No platform service is available for this intake.");
        const created = await platformApi.createCase({
          hospitalId: service.hospitalId || undefined,
          serviceId: service.id,
          role,
          participationIntent:
            payload.requestType || (payload.bloodDonor ? "blood" : "organ"),
        });
        const createdData = created.data as {
          caseId?: string;
          [key: string]: unknown;
        };
        if (!currentRequest()) return null;
        target = { ...createdData, id: createdData.caseId } as PlatformCase;
        setPlatform((previous) => ({
          ...previous,
          cases: [...previous.cases, target as PlatformCase],
        }));
      }
      if (!target.episodeId)
        throw new Error("Platform case has no intake episode.");
      const episodeId = target.episodeId;
      const existing = platform.intakes[episodeId];
      const {
        serviceCode: _serviceCode,
        serviceId: _serviceId,
        ...intakePayload
      } = payload;
      const response = await platformApi.saveIntake(episodeId, {
        ...intakePayload,
        ...(existing?.version ? { expectedVersion: existing.version } : {}),
      });
      if (!currentRequest()) return null;
      const intake = response.data as {
        declaredBloodGroup?: string;
        requestedOrgan?: string;
        urgency?: string;
        pledgedOrgans?: string[];
        availability?: string;
        [key: string]: unknown;
      };
      setPlatform((previous) => ({
        ...previous,
        intakes: { ...previous.intakes, [episodeId]: intake },
      }));
      setMatch((previous) =>
        role === "recipient"
          ? {
              ...previous,
              recipient: {
                ...previous.recipient,
                blood_type_needed:
                  intake.declaredBloodGroup ||
                  previous.recipient.blood_type_needed,
                organ_needed:
                  intake.requestedOrgan || previous.recipient.organ_needed,
                urgency:
                  intake.urgency === "routine"
                    ? "moderate"
                    : intake.urgency || previous.recipient.urgency,
              },
              organ: intake.requestedOrgan || previous.organ,
              urgencyLevel:
                intake.urgency === "routine"
                  ? "moderate"
                  : intake.urgency || previous.urgencyLevel,
            }
          : {
              ...previous,
              donor: {
                ...previous.donor,
                blood_type:
                  intake.declaredBloodGroup || previous.donor.blood_type,
                organ_pledged:
                  intake.pledgedOrgans || previous.donor.organ_pledged,
              },
              availability: intake.availability,
            },
      );
      return intake;
    },
    [accountId, platform.cases, platform.services, platform.intakes],
  );

  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (!legacyDemoWorkflowEnabled || platform.authoritative) return;
      if (e.key === MATCH_STORAGE_KEY) {
        const updated = parseStorageEventValue(e.newValue);
        setMatch(updated);
      }
    };
    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [legacyDemoWorkflowEnabled, platform.authoritative]);

  const advanceStatus = useCallback(
    (newStatus: string) => {
      if (!legacyDemoWorkflowEnabled || platform.authoritative) return;
      setMatch((prev) => {
        const updated = { ...prev, status: newStatus };
        if (!platform.authoritative) saveMatchToStorage(updated);

        // Emit simulated DICT eMessage push notifications on state transitions (Issue #010).
        // All copy is centralized in utils/eMessageToast.ts — see that file for the templates.
        const donorName = `${prev.donor.first_name} ${prev.donor.last_name}`;
        const recipientName = `${prev.recipient.first_name} ${prev.recipient.last_name}`;
        if (newStatus === "approved") {
          eMessageToast(toast, "approved", {
            recipient: recipientName,
            donor: donorName,
          });
        } else if (newStatus === "rejected") {
          eMessageToast(toast, "rejected", {});
        } else if (newStatus === "waiting_donor_confirmation") {
          eMessageToast(toast, "schedule_proposed", {
            recipient: recipientName,
          });
        } else if (newStatus === "waiting_recipient_confirmation") {
          eMessageToast(toast, "counter_proposed", { donor: donorName });
        } else if (newStatus === "scheduled") {
          eMessageToast(toast, "scheduled", {
            date:
              typeof prev.scheduledDate === "string" ? prev.scheduledDate : "",
            time:
              typeof prev.scheduledTime === "string" ? prev.scheduledTime : "",
            location:
              typeof prev.scheduledLocation === "string"
                ? prev.scheduledLocation
                : prev.hospital.name,
          });
        } else if (
          newStatus === "agreement_finalized" ||
          newStatus === "contract_signed"
        ) {
          eMessageToast(toast, "agreement_signed", {});
        }

        return updated;
      });
    },
    [toast, platform.authoritative, legacyDemoWorkflowEnabled],
  );

  const proposeSchedule = useCallback(
    ({
      date,
      time,
      location,
      proposedBy,
    }: {
      date: string;
      time?: string;
      location?: string;
      proposedBy: string;
    }) => {
      if (!legacyDemoWorkflowEnabled || platform.authoritative) return;
      setMatch((prev) => {
        const isDonor = proposedBy === "donor" || proposedBy === "Donor";
        const nextStatus = isDonor
          ? "waiting_recipient_confirmation"
          : "waiting_donor_confirmation";
        const kind = isDonor ? "counter_proposed" : "schedule_proposed";
        eMessageToast(toast, kind, { date, time, location });
        const updated = {
          ...prev,
          proposedSchedule: { date, time, location, proposedBy },
          status: nextStatus,
        };
        if (!platform.authoritative) saveMatchToStorage(updated);
        return updated;
      });
    },
    [toast, platform.authoritative, legacyDemoWorkflowEnabled],
  );

  const setScheduledDate = useCallback(
    (
      date: string,
      time = "10:00 AM",
      location = "Philippine General Hospital (PGH)",
    ) => {
      if (!legacyDemoWorkflowEnabled || platform.authoritative) return;
      setMatch((prev) => {
        const updated = {
          ...prev,
          scheduledDate: date,
          scheduledTime: time,
          scheduledLocation: location,
          proposedSchedule: { date, time, location, confirmed: true },
          status: "scheduled",
        };
        if (!platform.authoritative) saveMatchToStorage(updated);
        return updated;
      });
      eMessageToast(toast, "scheduled", { date, time, location });
    },
    [toast, platform.authoritative, legacyDemoWorkflowEnabled],
  );

  const anchorToBlockchain = useCallback(
    async (customAnchorData: unknown = null) => {
      if (!legacyDemoWorkflowEnabled || platform.authoritative) return null;
      if (customAnchorData) {
        setMatch((prev) => {
          const updated = { ...prev, blockchainAnchor: customAnchorData };
          if (!platform.authoritative) saveMatchToStorage(updated);
          return updated;
        });
        return customAnchorData;
      }

      try {
        const res = await api.anchorConsent({
          matchId: match.id,
          donorId: match.donor.id,
          recipientId: match.recipient.id,
          donorSignature: `sig_${match.donor.first_name.toLowerCase()}_${Date.now()}`,
          recipientSignature: `sig_${match.recipient.first_name.toLowerCase()}_${Date.now()}`,
        });
        const anchor = res.data;
        setMatch((prev) => {
          const updated = {
            ...prev,
            blockchainAnchor: anchor,
            status: "ready_for_transplant",
          };
          if (!platform.authoritative) saveMatchToStorage(updated);
          return updated;
        });
        return anchor;
      } catch {
        toast.error(
          "Blockchain anchoring failed. Check your connection and try again.",
          { title: "Anchoring failed" },
        );
        return null;
      }
    },
    [
      match.id,
      match.donor,
      match.recipient,
      toast,
      platform.authoritative,
      legacyDemoWorkflowEnabled,
    ],
  );

  const signAgreement = useCallback(
    (role: "donor" | "recipient") => {
      if (!legacyDemoWorkflowEnabled || platform.authoritative) return;
      setMatch((prev) => {
        const donorSigned = role === "donor" ? true : prev.donorSigned;
        const recipientSigned =
          role === "recipient" ? true : prev.recipientSigned;
        let status = prev.status;

        if (
          donorSigned &&
          recipientSigned &&
          ![
            "ready_for_transplant",
            "agreement_finalized",
            "contract_signed",
          ].includes(status)
        ) {
          status = "agreement_finalized";
          eMessageToast(toast, "agreement_signed", {});
          // Silently trigger background Besu anchoring without exposing web3 jargon to citizens
          void anchorToBlockchain();
        }
        const updated = { ...prev, donorSigned, recipientSigned, status };
        if (!platform.authoritative) saveMatchToStorage(updated);
        return updated;
      });
    },
    [anchorToBlockchain, toast, platform.authoritative, legacyDemoWorkflowEnabled],
  );

  // Backward compatibility setter for legacy setConsentSigned(true) calls from existing forms
  const setConsentSigned = useCallback(
    (val: boolean) => {
      if (!legacyDemoWorkflowEnabled || platform.authoritative) return;
      if (val) {
        signAgreement("donor");
        signAgreement("recipient");
      } else {
        setMatch((prev) => {
          const updated = {
            ...prev,
            donorSigned: false,
            recipientSigned: false,
          };
          if (!platform.authoritative) saveMatchToStorage(updated);
          return updated;
        });
      }
    },
    [signAgreement, platform.authoritative, legacyDemoWorkflowEnabled],
  );

  const resetMatch = useCallback(() => {
    if (!legacyDemoWorkflowEnabled || platform.authoritative) return;
    setMatch(INITIAL_DEMO_MATCH);
    clearMatchFromStorage();
    clearStaticMatchesFromStorage();
    toast.info(
      "Match demo state reset to initial pending institutional review.",
      { title: "State Reset" },
    );
  }, [toast, platform.authoritative, legacyDemoWorkflowEnabled]);

  const updateMatchFromProfile = useCallback(
    (role: "donor" | "recipient", profileFields: ProfileFields) => {
      if (!legacyDemoWorkflowEnabled || platform.authoritative) return { success: false };
      const result = calculateUpdatedMatchFromProfile(
        match,
        role,
        profileFields,
      );
      if (result.success && result.updatedMatch) {
        setMatch(result.updatedMatch);
        if (!platform.authoritative) saveMatchToStorage(result.updatedMatch);
      }
      return result;
    },
    [match, platform.authoritative, legacyDemoWorkflowEnabled],
  );

  // Derived convenience attributes for components
  const isApproved = useMemo(() => {
    return [
      "approved",
      "waiting_donor_confirmation",
      "waiting_recipient_confirmation",
      "scheduled",
      "agreement_finalized",
      "contract_signed",
      "ready_for_transplant",
    ].includes(match.status);
  }, [match.status]);

  const hospitalApproved = isApproved;

  const consentSigned: boolean = useMemo(() => {
    return (
      Boolean(match.donorSigned && match.recipientSigned) ||
      [
        "agreement_finalized",
        "contract_signed",
        "ready_for_transplant",
      ].includes(match.status)
    );
  }, [match.donorSigned, match.recipientSigned, match.status]);

  const isAgreementFinalized = consentSigned;
  const agreementSigned = consentSigned;

  const value: MatchContextValue = useMemo(
    () => ({
      match,
      advanceStatus,
      proposeSchedule,
      setScheduledDate,
      signAgreement,
      anchorToBlockchain,
      setConsentSigned,
      resetMatch,
      updateMatchFromProfile,
      isApproved,
      hospitalApproved,
      consentSigned,
      isAgreementFinalized,
      agreementSigned,
      platform,
      currentPair: platform.currentPair,
      saveIntake,
    }),
    [
      match,
      advanceStatus,
      proposeSchedule,
      setScheduledDate,
      signAgreement,
      anchorToBlockchain,
      setConsentSigned,
      resetMatch,
      updateMatchFromProfile,
      isApproved,
      hospitalApproved,
      consentSigned,
      isAgreementFinalized,
      agreementSigned,
      platform,
      saveIntake,
    ],
  );

  return (
    <MatchContext.Provider value={value}>{children}</MatchContext.Provider>
  );
}

export function useMatch() {
  const context = useContext(MatchContext);
  if (!context) {
    throw new Error("useMatch must be used within a MatchProvider");
  }
  return context;
}
