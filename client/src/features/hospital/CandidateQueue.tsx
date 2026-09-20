import React, { useEffect, useState } from "react";
import { platformApi } from "../../services/platformApi";
type Candidate = {
  candidateId: string;
  targetVersion?: number;
  version?: number;
  recipient?: {
    role?: string;
  };
  donor?: { role?: string };
  hospitalId?: string;
  serviceId?: string;
  coordinationStatus?: string;
};
type Reviewer = {
  id: string;
  displayName?: string;
  name?: string;
  role?: string;
};
type Props = {
  serviceId?: string;
  /** @deprecated Reviewer IDs are now selected from the scoped reviewer list. */
  reviewerAccountId?: string;
  onSelected?: (value: unknown) => void;
};
const field = (value: unknown, key: string): unknown =>
  typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)[key]
    : undefined;

export default function CandidateQueue({
  serviceId,
  reviewerAccountId,
  onSelected,
}: Props) {
  const [rows, setRows] = useState<Candidate[]>([]);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState("");
  const [reviewers, setReviewers] = useState<Reviewer[]>([]);
  const [activeReviewer, setActiveReviewer] = useState(reviewerAccountId || "");
  const load = () => {
    if (typeof platformApi.candidates !== "function") return;
    platformApi
      .candidates()
      .then((r) => {
        const data = field(r, "data");
        const items = field(data, "items");
        setRows(Array.isArray(items) ? (items as Candidate[]) : []);
      })
      .catch((e: unknown) =>
        setError(
          typeof field(e, "message") === "string"
            ? (field(e, "message") as string)
            : "Candidate queue is unavailable.",
        ),
      );
  };
  useEffect(() => {
    load();
    if (typeof platformApi.reviewers !== "function") return;
    platformApi
      .reviewers(serviceId)
      .then((r) => {
        const data = field(r, "data");
        const items = field(data, "items");
        setReviewers(Array.isArray(items) ? (items as Reviewer[]) : []);
      })
      .catch(() => setReviewers([]));
  }, [serviceId]);
  const select = async (row: Candidate) => {
    setSelected(row.candidateId);
    setError("");
    try {
      const response = await platformApi.selectCandidate(row.candidateId, {
        reviewerAccountId: activeReviewer,
        targetVersion: row.targetVersion ?? row.version,
        idempotencyKey: `candidate-select:${row.candidateId}`,
      });
      setRows((current) =>
        current.filter((item) => item.candidateId !== row.candidateId),
      );
      onSelected?.(response?.data || response);
    } catch (e: unknown) {
      setError(
        field(e, "status") === 409
          ? "This candidate was selected by another reviewer. Refresh the queue."
          : typeof field(e, "message") === "string"
            ? (field(e, "message") as string)
            : "Selection failed.",
      );
    } finally {
      setSelected("");
    }
  };
  return (
    <section
      className="card hospital-candidate-queue"
      aria-labelledby="candidate-queue-heading"
    >
      <h2 id="candidate-queue-heading">Exact candidate queue</h2>
      <p>
        Synthetic-only, unranked coordination candidates. Selection does not
        imply compatibility, eligibility, or clinical suitability.
      </p>
      {error && <p role="alert">{error}</p>}
      <label htmlFor="candidate-reviewer-account">
        Assigned hospital reviewer
      </label>
      <select
        id="candidate-reviewer-account"
        value={activeReviewer}
        onChange={(e) => setActiveReviewer(e.target.value)}
      >
        <option value="">Select an eligible reviewer</option>
        {reviewers.map((reviewer) => (
          <option key={reviewer.id} value={reviewer.id}>
            {reviewer.displayName || reviewer.name || reviewer.id}
            {reviewer.role ? ` · ${reviewer.role}` : ""}
          </option>
        ))}
      </select>
      {!activeReviewer && (
        <p role="status">
          Select an eligible reviewer before selecting a candidate.
        </p>
      )}
      {rows.length === 0 ? (
        <p role="status">No eligible candidates are currently available.</p>
      ) : (
        <div>
          {rows.map((row) => (
            <article key={row.candidateId} className="candidate-row">
              <h3>Recipient episode · Donor episode</h3>
              <p>
                {row.hospitalId} / {row.serviceId}
              </p>
              <small>
                Coordination status: {row.coordinationStatus || "available"}
              </small>
              <br />
              <button
                type="button"
                className="btn btn-primary btn-sm"
                disabled={!activeReviewer || selected === row.candidateId}
                onClick={() => select(row)}
              >
                {selected === row.candidateId
                  ? "Selecting…"
                  : "Select candidate"}
              </button>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

type ReviewerScheduleProps = {
  pairId?: string;
  status?: string;
  targetVersion?: number;
  supersedesId?: string;
  onSuccess?: (value: unknown) => void;
};
export function ReviewerSchedulePanel({
  pairId,
  status,
  targetVersion,
  supersedesId,
  onSuccess,
}: ReviewerScheduleProps) {
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [location, setLocation] = useState("");
  const [slotReference, setSlotReference] = useState("");
  const [error, setError] = useState("");
  if (!pairId || status !== "awaiting_schedule") return null;
  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    if (!slotReference.trim()) {
      setError("Hospital slot reference is required.");
      return;
    }
    const manila = (value: string) => `${value}:00+08:00`;
    try {
      const response = await platformApi.scheduleProposals(pairId, {
        startsAt: manila(start),
        endsAt: manila(end),
        timeZone: "Asia/Manila",
        location,
        slotReference: slotReference.trim(),
        source: "simulated-hospital",
        targetVersion,
        ...(supersedesId ? { supersedesId } : {}),
      });
      onSuccess?.(response?.data || response);
    } catch (cause: unknown) {
      const details = cause as { status?: number; message?: string };
      setError(
        details.status === 409
          ? "This schedule changed. Refresh before proposing another time."
          : details.message || "Schedule proposal could not be recorded.",
      );
    }
  };
  return (
    <section
      className="card reviewer-schedule-panel"
      aria-labelledby="reviewer-schedule-heading"
    >
      <h2 id="reviewer-schedule-heading">Propose a coordination schedule</h2>
      <p>
        Rendered in Asia/Manila. A proposal is a coordination step, not a
        booking or medical consent.
      </p>
      {error && <p role="alert">{error}</p>}
      <form onSubmit={submit}>
        <label htmlFor="schedule-start">Start (Asia/Manila)</label>
        <input
          id="schedule-start"
          type="datetime-local"
          required
          value={start}
          onChange={(e) => setStart(e.target.value)}
        />
        <label htmlFor="schedule-end">End (Asia/Manila)</label>
        <input
          id="schedule-end"
          type="datetime-local"
          required
          value={end}
          onChange={(e) => setEnd(e.target.value)}
        />
        <label htmlFor="schedule-location">Location label</label>
        <input
          id="schedule-location"
          required
          value={location}
          onChange={(e) => setLocation(e.target.value)}
        />
        <label htmlFor="schedule-slot-reference">
          Hospital slot/source reference
        </label>
        <input
          id="schedule-slot-reference"
          required
          value={slotReference}
          onChange={(e) => setSlotReference(e.target.value)}
        />
        <button className="btn btn-primary btn-sm" type="submit">
          Propose schedule
        </button>
      </form>
    </section>
  );
}
