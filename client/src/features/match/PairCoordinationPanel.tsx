import React, { useEffect, useRef, useState } from "react";
import { platformApi } from "../../services/platformApi";

type Proposal = {
  id: string;
  state?: string;
  startsAt?: string;
  location?: string;
  targetVersion?: number;
  version?: number;
};
type Pair = {
  id?: string;
  version?: number;
  targetVersion?: number;
  state?: string;
  activeProposal?: Proposal;
  scheduleProposal?: Proposal;
  episodeId?: string;
  participation?: string;
  participationState?: string;
  milestones?: Array<{ label?: string; status?: string; nextStep?: string }>;
  nextStep?: string;
};
type Episode = {
  id?: string;
  participation?: string;
  version?: number;
  lifecycle?: string;
};
type PairMessage = {
  id?: string;
  senderRole?: string;
  role?: string;
  body?: string;
};
type Consent = {
  id?: string;
  version?: string;
  consentVersion?: string;
  purpose?: string;
  scope?: string;
  action?: string;
  anchorStatus?: string;
  txHash?: string;
  blockHash?: string;
  blockNumber?: number;
  createdAt?: string;
};
type ConsentRequirement = { id: "coordination" | "information_sharing"; text: string };
type ConsentEnvelope = {
  requirements?: { consentVersion?: string; scope?: string; purposes?: ConsentRequirement[] };
  current?: Partial<Record<"coordination" | "information_sharing", string>>;
  events?: Consent[];
  counterpart?: Partial<Record<"coordination" | "information_sharing", string>>;
  pairVersion?: number;
};
const alias = (role: string | undefined) =>
  ({ donor: "Anonymous donor", recipient: "Anonymous recipient" })[
    role as "donor" | "recipient"
  ] || "Anonymous participant";
const actionKey = (kind: string, id: string) => `${kind}:${id}`;
const safeCoordinationText = (value?: string) => {
  if (
    !value ||
    /clinical|medical|diagnos|clearance|blood|organ|phone|email|name|contact|reason/i.test(
      value,
    )
  )
    return "";
  return value;
};
const newestEvents = (events: Consent[] = []) =>
  [...events].sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
type PairProps = {
  role?: string;
  pairId?: string;
  reviewer?: boolean;
  currentPair?: {
    id?: string;
    version?: number;
    state?: string;
    targetVersion?: number;
    episodeId?: string;
  } | null;
  episodeId?: string;
};
export default function PairCoordinationPanel({
  role: _role,
  pairId,
  reviewer = false,
  currentPair: currentPairProp,
  episodeId: episodeIdProp,
}: PairProps) {
  const [pair, setPair] = useState<Pair | null>(null);
  const [episode, setEpisode] = useState<Episode | null>(null);
  const [error, setError] = useState("");
  const [body, setBody] = useState("");
  const [messages, setMessages] = useState<PairMessage[]>([]);
  const [teamConversation, setTeamConversation] = useState<{
    id?: string;
  } | null>(null);
  const [teamMessages, setTeamMessages] = useState<PairMessage[]>([]);
  const [teamBody, setTeamBody] = useState("");
  const [episodeConsent, setEpisodeConsent] = useState<ConsentEnvelope>({});
  const [pairConsent, setPairConsent] = useState<ConsentEnvelope>({});
  const [consentConfirm, setConsentConfirm] = useState<Record<string, boolean>>({});
  const [consentBusy, setConsentBusy] = useState("");
  const consentKeys = useRef<Record<string, string>>({});
  const viewGeneration = useRef(0);
  const episodeConsentGeneration = useRef(0);
  const pairConsentGeneration = useRef(0);
  const [authoritativePair, setAuthoritativePair] = useState<Pair | null>(
    currentPairProp || null,
  );
  const activePairId: string = String(
    reviewer ? pairId || "" : authoritativePair?.id || "",
  );
  const episodeId =
    episodeIdProp || authoritativePair?.episodeId || pair?.episodeId;
  const consentContext = (target: "case" | "pair") => {
    const metadata = target === "case" ? episodeConsent : pairConsent;
    const targetId = target === "case" ? episodeId : activePairId;
    return `${target}:${targetId || ""}:${metadata.requirements?.scope || ""}:${metadata.requirements?.consentVersion || ""}:${metadata.pairVersion || pair?.version || ""}`;
  };
  const consentKey = (target: "case" | "pair", purpose: string, action: string) =>
    `${consentContext(target)}:${purpose}:${action}`;
  useEffect(() => {
    viewGeneration.current += 1;
    setConsentConfirm({});
    consentKeys.current = {};
    episodeConsentGeneration.current += 1;
    pairConsentGeneration.current += 1;
  }, [episodeId, activePairId, episodeConsent.requirements?.scope, episodeConsent.requirements?.consentVersion, pairConsent.requirements?.scope, pairConsent.requirements?.consentVersion, pairConsent.pairVersion]);
  const participation =
    episode?.participation ||
    pair?.participationState ||
    pair?.participation ||
    "active";
  useEffect(() => {
    if (!episodeId || typeof platformApi.episode !== "function") return;
    const generation = viewGeneration.current;
    platformApi
      .episode(episodeId)
      .then((r) => {
        if (generation === viewGeneration.current)
          setEpisode((r as { data?: Episode }).data || (r as Episode));
      })
      .catch((e) =>
        setError(
          (e as { message?: string }).message ||
            "Case status is unavailable. You can retry.",
        ),
      );
  }, [episodeId]);
  useEffect(() => {
    if (!episodeId || typeof platformApi.episodeConsents !== "function") return;
    let cancelled = false;
    const generation = ++episodeConsentGeneration.current;
    platformApi.episodeConsents(episodeId)
      .then((r) => { if (!cancelled && generation === episodeConsentGeneration.current) setEpisodeConsent((r as { data?: ConsentEnvelope }).data || {}); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [episodeId, episode?.version]);
  useEffect(() => {
    if (reviewer || typeof platformApi.currentPair !== "function") return;
    platformApi
      .currentPair()
      .then((r) => setAuthoritativePair(r?.data || null))
      .catch((e) => {
        if ((e as { status?: number }).status !== 404)
          setError(
            (e as { message?: string }).message ||
              "Pair details are unavailable.",
          );
      });
  }, [reviewer]);
  useEffect(() => {
    if (currentPairProp) {
      setAuthoritativePair(currentPairProp);
      if (reviewer) setPair(currentPairProp);
    }
  }, [currentPairProp, reviewer]);
  useEffect(() => {
    if (!activePairId || typeof platformApi.pair !== "function") return;
    const generation = viewGeneration.current;
    platformApi
      .pair(String(activePairId))
      .then((r) => {
        if (generation === viewGeneration.current) setPair(r.data || r.pair || r);
      })
      .catch((e) =>
        setError(
          (e as { message?: string }).message ||
            "Pair details are unavailable.",
        ),
      );
  }, [activePairId, currentPairProp?.version]);
  useEffect(() => {
    if (!activePairId || typeof platformApi.pairConsents !== "function") return;
    let cancelled = false;
    const generation = ++pairConsentGeneration.current;
    platformApi.pairConsents(activePairId)
      .then((r) => { if (!cancelled && generation === pairConsentGeneration.current) setPairConsent((r as { data?: ConsentEnvelope }).data || {}); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [activePairId, pair?.version]);
  useEffect(() => {
    let cancelled = false;
    let running = false;
    const refreshProofs = async () => {
      if (running || cancelled) return;
      running = true;
      try {
        if (episodeId) {
          const generation = ++episodeConsentGeneration.current;
          const result = await platformApi.episodeConsents(episodeId);
          if (!cancelled && generation === episodeConsentGeneration.current) setEpisodeConsent((result as { data?: ConsentEnvelope }).data || {});
        }
        if (activePairId) {
          const generation = ++pairConsentGeneration.current;
          const result = await platformApi.pairConsents(activePairId);
          if (!cancelled && generation === pairConsentGeneration.current) setPairConsent((result as { data?: ConsentEnvelope }).data || {});
        }
      } finally { running = false; }
    };
    const timer = window.setInterval(() => void refreshProofs(), 15000);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, [episodeId, activePairId]);
  useEffect(() => {
    if (
      !activePairId ||
      !pair ||
      !["awaiting_schedule", "awaiting_consent"].includes(pair.state || "") ||
      typeof platformApi.pairMessages !== "function"
    )
      return;
    platformApi
      .pairMessages(String(activePairId))
      .then((r) =>
        setMessages(
          (r as { data?: { items?: PairMessage[] } }).data?.items || [],
        ),
      )
      .catch(() => {});
  }, [activePairId, pair?.state]);
  useEffect(() => {
    if (reviewer || typeof platformApi.conversations !== "function") return;
    platformApi
      .conversations()
      .then((r) => {
        const raw = r as { data?: unknown };
        const items = (
          Array.isArray(raw.data)
            ? raw.data
            : (raw.data as { items?: unknown[] } | undefined)?.items || []
        ) as Array<{
          id?: string;
          episodeId?: string;
          type?: string;
          kind?: string;
        }>;
        setTeamConversation(
          items.find(
            (item) =>
              item.episodeId === episodeId &&
              /team|coordination/i.test(
                `${item.type || ""} ${item.kind || ""}`,
              ),
          ) ||
            items.find((item) => item.episodeId === episodeId) ||
            null,
        );
      })
      .catch((e) =>
        setError(
          (e as { message?: string }).message ||
            "Assigned team conversation is unavailable. You can retry.",
        ),
      );
  }, [reviewer, episodeId]);
  useEffect(() => {
    if (!teamConversation?.id) return;
    platformApi
      .messages(teamConversation.id)
      .then((r) => {
        const raw = r as { data?: unknown };
        setTeamMessages(
          (Array.isArray(raw.data)
            ? raw.data
            : (raw.data as { items?: PairMessage[] } | undefined)?.items ||
              []) as PairMessage[],
        );
      })
      .catch((e) =>
        setError(
          (e as { message?: string }).message ||
            "Assigned team messages are unavailable. You can retry.",
        ),
      );
  }, [teamConversation?.id]);
  const respond = async (response: string) => {
    if (!pair) return;
    try {
      const r = await platformApi.respondToPair(String(activePairId), {
        response,
        targetVersion: pair.targetVersion ?? pair.version,
        idempotencyKey: actionKey(`pair-${response}`, activePairId),
      });
      setPair(r?.data || pair);
    } catch (e) {
      setError(
        (e as { status?: number }).status === 409
          ? "This pair response is no longer current. Refresh to see the latest state."
          : (e as { message?: string }).message ||
              "Your response could not be recorded.",
      );
    }
  };
  const consentAction = async (
    target: "case" | "pair",
    purpose: "coordination" | "information_sharing",
    action: "grant" | "withdraw",
  ) => {
    const targetId = target === "case" ? episodeId : activePairId;
    const requestKey = consentKey(target, purpose, action);
    if (!targetId || reviewer || (action === "grant" && !consentConfirm[requestKey])) return;
    const key = requestKey;
    const generation = viewGeneration.current;
    const consentGeneration = target === "case" ? episodeConsentGeneration : pairConsentGeneration;
    const mutationGeneration = ++consentGeneration.current;
    consentKeys.current[key] ||= crypto.randomUUID();
    setConsentBusy(key);
    try {
      const body = {
        action,
        consentVersion: (target === "case" ? episodeConsent : pairConsent).requirements?.consentVersion,
        purpose,
        scope: (target === "case" ? episodeConsent : pairConsent).requirements?.scope,
        evidence: "authenticated-explicit-confirmation",
        idempotencyKey: consentKeys.current[key],
        ...(target === "pair" ? { targetVersion: pairConsent.pairVersion ?? pair?.version } : {}),
      };
      if (target === "case") {
        await platformApi.submitEpisodeConsent(targetId, body);
        const refreshGeneration = ++consentGeneration.current;
        const refreshed = await platformApi.episodeConsents(targetId);
        if (generation === viewGeneration.current && refreshGeneration === consentGeneration.current && mutationGeneration < refreshGeneration)
          setEpisodeConsent((refreshed as { data?: ConsentEnvelope }).data || {});
      } else {
        await platformApi.submitPairConsent(targetId, body);
        const refreshGeneration = ++consentGeneration.current;
        const [refreshed, pairResult] = await Promise.all([
          platformApi.pairConsents(targetId),
          platformApi.pair(targetId),
        ]);
        if (generation === viewGeneration.current && refreshGeneration === consentGeneration.current && mutationGeneration < refreshGeneration) {
          setPairConsent((refreshed as { data?: ConsentEnvelope }).data || {});
          setPair((pairResult as { data?: Pair }).data || (pairResult as Pair));
        }
      }
      delete consentKeys.current[key];
      setConsentConfirm((current) => ({ ...current, [requestKey]: false }));
    } catch (e) {
      setError((e as { message?: string }).message || "Consent could not be recorded. You can retry.");
    } finally {
      setConsentBusy("");
    }
  };
  const send = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!body.trim()) return;
    try {
      const r = await platformApi.sendPairMessage(String(activePairId), {
        body,
      });
      setMessages((m) => [...m, r?.data || r]);
      setBody("");
    } catch (e) {
      setError(
        (e as { message?: string }).message || "Message could not be sent.",
      );
    }
  };
  const sendTeamMessage = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!teamConversation?.id || !teamBody.trim()) return;
    try {
      const r = await platformApi.sendMessage(
        teamConversation.id,
        teamBody.trim(),
      );
      setTeamMessages((items) => [
        ...items,
        (r as { data?: PairMessage }).data || (r as PairMessage),
      ]);
      setTeamBody("");
    } catch (e) {
      setError(
        (e as { message?: string }).message ||
          "Message could not be sent. You can retry.",
      );
    }
  };
  const changeParticipation = async (
    action: "pause" | "resume" | "withdraw",
  ) => {
    if (!episodeId) return;
    try {
      const r = await platformApi.episodeAction(
        episodeId,
        action,
        Number(episode?.version || 0),
      );
      // Episode participation is a separate overlay; never merge its response into pair state.
      void r;
      const refreshed = await platformApi.episode(episodeId);
      setEpisode(
        (refreshed as { data?: Episode }).data || (refreshed as Episode),
      );
      if (activePairId && typeof platformApi.pair === "function") {
        const pairResult = await platformApi.pair(activePairId);
        setPair((pairResult as { data?: Pair }).data || (pairResult as Pair));
      }
    } catch (e) {
      setError(
        (e as { status?: number }).status === 409
          ? "This case changed in another session. Refresh and try again."
          : (e as { message?: string }).message ||
              `Could not ${action} this case. You can retry.`,
      );
    }
  };
  const [proposals, setProposals] = useState<Proposal[]>([]);
  useEffect(() => {
    if (
      !activePairId ||
      !pair ||
      !["awaiting_schedule", "awaiting_consent"].includes(pair.state || "") ||
      typeof platformApi.scheduleProposals !== "function"
    )
      return;
    platformApi
      .scheduleProposals(String(activePairId))
      .then((r) =>
        setProposals(
          (r as { data?: { items?: Proposal[] } }).data?.items || [],
        ),
      )
      .catch(() => {});
  }, [activePairId, pair?.state, currentPairProp?.version]);
  const proposal =
    proposals.find((item) => item.state === "active") ||
    pair?.activeProposal ||
    pair?.scheduleProposal;
  const refresh = async () => {
    const [pairResult, proposalResult] = await Promise.all([
      platformApi.pair(String(activePairId)),
      platformApi.scheduleProposals(String(activePairId)),
    ]);
    setPair((pairResult as { data?: Pair }).data || (pairResult as Pair));
    setProposals(
      (proposalResult as { data?: { items?: Proposal[] } }).data?.items || [],
    );
  };
  const respondSchedule = async (response: string) => {
    try {
      await platformApi.respondToSchedule(String(activePairId), proposal!.id, {
        response,
        targetVersion: proposal!.targetVersion ?? proposal!.version,
        idempotencyKey: actionKey(
          `schedule-${response}-${proposal!.id}`,
          activePairId,
        ),
      });
      await refresh();
    } catch (e) {
      setError(
        (e as { status?: number }).status === 409
          ? "This schedule response is no longer current. Refresh to see the latest state."
          : (e as { message?: string }).message ||
              "Schedule response could not be recorded.",
      );
    }
  };
  const closeChat = async () => {
    if (!pair) return;
    try {
      await platformApi.closePairConversation(String(activePairId), {
        expectedVersion: pair.version,
      });
    } catch (e) {
      setError(
        (e as { message?: string }).message ||
          "Conversation could not be closed.",
      );
    }
  };
  return (
    <section
      className="card pair-coordination-panel"
      aria-labelledby="pair-coordination-heading"
    >
      <h2 id="pair-coordination-heading">Coordination update</h2>
      <p>
        Synthetic-only, unranked coordination support. This does not establish
        compatibility, eligibility, or clinical clearance.
      </p>
      {!activePairId && (
        <p role="status">No active pair is currently available.</p>
      )}
      {error && <p role="alert">{error}</p>}
      {!pair && !error && (
        <p role="status">No active pair is currently available.</p>
      )}
      {episodeId && !reviewer && (
        <div
          aria-label="Participation controls"
          data-episode-version={episode?.version}
        >
          <h3>Participation</h3>
          <p>
            These are separate coordination permissions for this case. They do
            not grant medical consent or clinical clearance and do not cover a
            future pair automatically.
          </p>
          {(episodeConsent.requirements?.purposes || []).map(({ id: purpose, text }) => {
            const current = episodeConsent.current?.[purpose] === "granted";
            const label = text;
            const latest = episodeConsent.events?.find((event) => event.purpose === purpose);
            const grantKey = consentKey("case", purpose, "grant");
            return (
              <div key={purpose} className="consent-control">
                <strong>{label}</strong>
                <p>{current ? "Granted for this case." : `${episodeConsent.current?.[purpose] || "required"}.`} {latest && `Latest proof: ${latest.anchorStatus || "pending"}.`}</p>
                {latest?.txHash && <small>Staging transaction: {latest.txHash} · Recorded {latest.createdAt || "time unavailable"}</small>}
                {!!episodeConsent.events?.filter((event) => event.purpose === purpose).length && <ol aria-label={`${label} consent history`}>{newestEvents(episodeConsent.events.filter((event) => event.purpose === purpose)).map((event) => <li key={event.id || `${event.createdAt}-${event.action}-${event.purpose}`}>{event.action || "action"} · {event.purpose || purpose} · {event.createdAt || "time unavailable"} · proof {event.anchorStatus || "pending"}{event.txHash ? ` · tx ${event.txHash}` : ""}</li>)}</ol>}
                <label>
                  <input type="checkbox" checked={Boolean(consentConfirm[grantKey])} onChange={(e) => setConsentConfirm((state) => ({ ...state, [grantKey]: e.target.checked }))} />
                  I explicitly confirm this purpose for this synthetic case.
                </label>{" "}
                <button type="button" className="btn btn-primary btn-sm" disabled={current || consentBusy === grantKey} onClick={() => void consentAction("case", purpose, "grant")}>
                  Grant {label}
                </button>{" "}
                <button type="button" className="btn btn-ghost btn-sm" disabled={!current || consentBusy === consentKey("case", purpose, "withdraw")} onClick={() => { if (window.confirm(`Withdraw ${label} for this case? Dependent coordination and sharing will stop.`)) void consentAction("case", purpose, "withdraw"); }}>
                  Withdraw
                </button>
              </div>
            );
          })}
          <p>
            Pause stops new invitations and progression while commitments remain
            visible.
          </p>
          {participation === "withdrawn" ? (
            <p role="status">Withdrawn. Progression controls are disabled.</p>
          ) : (
            <>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() =>
                  changeParticipation(
                    participation === "paused" ? "resume" : "pause",
                  )
                }
              >
                {participation === "paused" ? "Resume case" : "Pause case"}
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  if (
                    window.confirm(
                      "Withdraw from this case? This cannot be undone here.",
                    )
                  )
                    void changeParticipation("withdraw");
                }}
              >
                Withdraw
              </button>
            </>
          )}
        </div>
      )}
      {!reviewer && teamConversation?.id && (
        <div aria-label="Assigned coordination team conversation">
          <h3>Assigned coordination team</h3>
          <p>
            Message your assigned coordination team. No direct Doctor or
            counterpart chat is provided here.
          </p>
          {teamMessages.map((m, i) => (
            <p key={m.id || i}>
              <strong>
                {m.senderRole === "citizen" ? "You" : "Coordination team"}
              </strong>
              : {m.body}
            </p>
          ))}
          <form onSubmit={sendTeamMessage}>
            <label htmlFor="team-message">
              Message assigned coordination team
            </label>
            <textarea
              id="team-message"
              maxLength={2000}
              value={teamBody}
              onChange={(e) => setTeamBody(e.target.value)}
            />
            <button className="btn btn-primary btn-sm" type="submit">
              Send to team
            </button>
          </form>
        </div>
      )}
      {!reviewer && participation === "withdrawn" && (
        <p role="status">
          Your coordination team has been notified. They will follow up. Any
          hospital booking remains unresolved until the hospital confirms its
          status; eBuhay has not claimed cancellation.
        </p>
      )}
      {pair && (
        <>
          {Array.isArray(pair.milestones) && pair.milestones.length > 0 && (
            <div aria-label="Shared coordination milestones">
              <h3>Shared coordination milestones</h3>
              {pair.milestones.map((milestone, index) => (
                <p key={index}>
                  <strong>
                    {safeCoordinationText(milestone.label) ||
                      "Coordination update"}
                  </strong>
                  {safeCoordinationText(milestone.status)
                    ? ` · ${safeCoordinationText(milestone.status)}`
                    : ""}
                  {safeCoordinationText(milestone.nextStep)
                    ? ` · Next: ${safeCoordinationText(milestone.nextStep)}`
                    : ""}
                </p>
              ))}
            </div>
          )}
          {safeCoordinationText(pair.nextStep) && (
            <p>Next coordination step: {safeCoordinationText(pair.nextStep)}</p>
          )}
          <p role="status">
            Status:{" "}
            {pair.state === "awaiting_consent"
              ? "Coordination consent pending"
              : String(pair.state || "pending").replaceAll("_", " ")}
          </p>
          {pair.state === "awaiting_citizen_acceptance" && !reviewer && (
            <div>
              <p>
                Review the proposed pair. Your response is final for this
                proposal.
              </p>
              <button
                className="btn btn-primary btn-sm"
                type="button"
                onClick={() => respond("accept")}
                disabled={participation !== "active"}
              >
                Accept pair
              </button>{" "}
              <button
                className="btn btn-ghost btn-sm"
                type="button"
                onClick={() => respond("decline")}
                disabled={participation !== "active"}
              >
                Decline pair
              </button>
            </div>
          )}
          {proposal && (
            <div className="schedule-proposal">
              <h3>Hospital schedule proposal</h3>
              <p>
                {new Intl.DateTimeFormat("en-PH", {
                  dateStyle: "medium",
                  timeStyle: "short",
                  timeZone: "Asia/Manila",
                }).format(new Date(proposal!.startsAt || ""))}{" "}
                · {proposal!.location}
              </p>
              {!reviewer && pair.state === "awaiting_schedule" && (
                <>
                  <button
                    className="btn btn-primary btn-sm"
                    type="button"
                    onClick={() => respondSchedule("confirm")}
                    disabled={participation !== "active"}
                  >
                    Confirm schedule
                  </button>{" "}
                  <button
                    className="btn btn-ghost btn-sm"
                    type="button"
                    onClick={() => respondSchedule("decline")}
                    disabled={participation !== "active"}
                  >
                    Decline schedule
                  </button>
                </>
              )}
            </div>
          )}
          {pair.state === "awaiting_schedule" && (
            <p>
              Both participants accepted. Scheduling is coordinated by the
              assigned hospital reviewer.
            </p>
          )}
          {pairConsent.requirements?.purposes && pairConsent.requirements.purposes.length > 0 && !reviewer && (
            <div>
              <p>
                These are pair-specific coordination permissions, separate from
                medical consent, clinical clearance, or a confirmed booking.
              </p>
              {pairConsent.requirements.purposes.map(({ id: purpose, text }) => {
                const current = pairConsent.current?.[purpose] === "granted";
                const grantKey = consentKey("pair", purpose, "grant");
                const latest = pairConsent.events?.find((event) => event.purpose === purpose);
                return (
                  <div className="consent-control" key={purpose}>
                    <strong>{text}</strong>
                    <p>{current ? "Granted for this pair." : `${pairConsent.current?.[purpose] || "required"}.`} {latest && `Latest proof: ${latest.anchorStatus || "pending"}.`}</p>
                    {latest?.txHash && <small>Staging transaction: {latest.txHash} · Recorded {latest.createdAt || "time unavailable"}</small>}
                    {!!pairConsent.events?.filter((event) => event.purpose === purpose).length && <ol aria-label={`${text} consent history`}>{newestEvents(pairConsent.events.filter((event) => event.purpose === purpose)).map((event) => <li key={event.id || `${event.createdAt}-${event.action}-${event.purpose}`}>{event.action || "action"} · {event.purpose || purpose} · {event.createdAt || "time unavailable"} · proof {event.anchorStatus || "pending"}{event.txHash ? ` · tx ${event.txHash}` : ""}</li>)}</ol>}
                    <label>
                      <input type="checkbox" checked={Boolean(consentConfirm[grantKey])} onChange={(e) => setConsentConfirm((state) => ({ ...state, [grantKey]: e.target.checked }))} />
                      I explicitly confirm this purpose for this synthetic pair.
                    </label>{" "}
                    <button type="button" className="btn btn-primary btn-sm" disabled={current || consentBusy === grantKey} onClick={() => void consentAction("pair", purpose, "grant")}>
                      Grant pair permission
                    </button>{" "}
                    {current && (
                      <button type="button" className="btn btn-ghost btn-sm" disabled={consentBusy === consentKey("pair", purpose, "withdraw")} onClick={() => { if (window.confirm(`Withdraw ${text} for this pair? Dependent sharing will stop.`)) void consentAction("pair", purpose, "withdraw"); }}>
                        Withdraw pair permission
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          {["awaiting_schedule", "awaiting_consent"].includes(
            pair.state || "",
          ) && (
            <>
              <h3>Anonymous participant chat</h3>
              {messages.map((m, i) => (
                <p key={m.id || i}>
                  <strong>{alias(m.senderRole || m.role)}</strong>: {m.body}
                </p>
              ))}
              {!reviewer && (
                <form onSubmit={send}>
                  <label htmlFor="pair-message">
                    Message anonymous participant
                  </label>
                  <textarea
                    id="pair-message"
                    maxLength={2000}
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                  />
                  <button className="btn btn-primary btn-sm" type="submit">
                    Send message
                  </button>
                </form>
              )}
              {reviewer && (
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={closeChat}
                >
                  Close conversation
                </button>
              )}
            </>
          )}
        </>
      )}
    </section>
  );
}
