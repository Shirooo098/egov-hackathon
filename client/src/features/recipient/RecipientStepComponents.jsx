import "../../styles/components/recipient/RecipientStepComponents.css";
import React from "react";
import { SearchIcon } from "../../components/ui/Icons";

export function DeclareNeedStep({
  params,
  errors,
  handleParamChange,
  validateParams,
  setStep,
  resetFlow,
  BLOOD_TYPES,
  ORGANS,
}) {
  return (
    <div className="migrated-98c4742c">
      <div className="card anim-up">
        <h2 className="migrated-54ab2eb1">What do you need?</h2>
        <p className="migrated-0c6c78ac">
          Select the type of donation you require. The prototype will show
          sample compatibility results.
          <br />
          <strong>Note:</strong> Urgency level is sample input in this demo; no
          medical-record API is connected.
        </p>

        <div className="grid-auto migrated-ec5d549d">
          <div className="field">
            <label className="label" htmlFor="declare-request-type">
              Request Type
            </label>
            <select
              id="declare-request-type"
              className={`input ${errors.request_type ? "input-error" : ""}`}
              value={params.request_type}
              onChange={(e) =>
                handleParamChange("request_type", e.target.value)
              }
            >
              <option value="blood">Blood Donation</option>
              <option value="organ">Organ Donation</option>
            </select>
            {errors.request_type && (
              <div className="field-message field-error">
                <span>⚠</span>
                {errors.request_type}
              </div>
            )}
          </div>
          <div className="field">
            <label className="label" htmlFor="declare-blood-type">
              Blood Type Needed
            </label>
            <select
              id="declare-blood-type"
              className={`input ${errors.blood_type_needed ? "input-error" : ""}`}
              value={params.blood_type_needed}
              onChange={(e) =>
                handleParamChange("blood_type_needed", e.target.value)
              }
            >
              {BLOOD_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
            {errors.blood_type_needed && (
              <div className="field-message field-error">
                <span>⚠</span>
                {errors.blood_type_needed}
              </div>
            )}
          </div>
          {params.request_type === "organ" && (
            <div className="field">
              <label className="label" htmlFor="declare-organ-needed">
                Organ Needed
              </label>
              <select
                id="declare-organ-needed"
                className={`input ${errors.organ_needed ? "input-error" : ""}`}
                value={params.organ_needed}
                onChange={(e) =>
                  handleParamChange("organ_needed", e.target.value)
                }
              >
                <option value="">Select organ…</option>
                {ORGANS.map((o) => (
                  <option key={o} value={o}>
                    {o[0].toUpperCase() + o.slice(1)}
                  </option>
                ))}
              </select>
              {errors.organ_needed && (
                <div className="field-message field-error">
                  <span>⚠</span>
                  {errors.organ_needed}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="migrated-8a78b4b0">
          <strong>Medical-record integration (future):</strong> This prototype
          does not connect to PhilHealth or DOH records. It defaults to{" "}
          <strong>Moderate</strong> until a clinician supplies a value.
        </div>
      </div>

      <button
        className="btn btn-primary btn-lg btn-full anim-up-d1"
        onClick={() => {
          if (validateParams()) {
            setStep("find");
          }
        }}
      >
        <SearchIcon /> Find Compatible Donors
      </button>

      <button className="btn btn-ghost btn-full anim-up-d2" onClick={resetFlow}>
        Start Over
      </button>
    </div>
  );
}

export function FindDonorsStep({
  params,
  loading,
  findMatches,
  matches,
  consentSigned,
  handleMatch,
}) {
  return (
    <div className="migrated-c260eff8">
      <div className="card anim-up">
        <h2 className="migrated-54ab2eb1">Search Compatible Donors</h2>
        <p className="migrated-0c6c78ac">
          Looking for <strong>{params.blood_type_needed}</strong>{" "}
          {params.request_type === "organ" ? `(${params.organ_needed})` : ""}{" "}
          donors.
        </p>
        <button
          className="btn btn-primary btn-lg"
          onClick={findMatches}
          disabled={loading}
        >
          {loading ? (
            <>
              <span className="spinner" /> Searching…
            </>
          ) : (
            <>
              <SearchIcon /> Find Compatible Donors
            </>
          )}
        </button>
      </div>

      {matches.length > 0 && (
        <div>
          <div className="migrated-3ca797af">
            <div className="section-title migrated-3e549c1b">
              {matches.length} Donor{matches.length > 1 ? "s" : ""} Found
            </div>
            <span className="badge badge-verified">ABO / Rh sample match</span>
          </div>
          <div className="migrated-87d074f6">
            {matches.map((m, i) => {
              const score = m.compatibilityScore;
              const tier = score >= 85 ? "high" : score >= 65 ? "med" : "low";
              const scoreColor =
                score >= 85
                  ? "var(--emerald)"
                  : score >= 65
                    ? "var(--sun)"
                    : "var(--destructive)";
              return (
                <div
                  key={m.donor.id}
                  className="card card-interactive anim-up migrated-5705012a"
                  onClick={() => handleMatch(m)}
                >
                  <span className="migrated-9125aa31">#{i + 1}</span>
                  <div
                    className={`blood-pill ${params.request_type === "organ" ? "blood-pill-organ" : "blood-pill-blood"}`}
                  >
                    {m.donor.blood_type}
                  </div>
                  <div className="migrated-887679dc">
                    <div className="migrated-39fc62a1">
                      {consentSigned
                        ? `${m.donor.first_name} ${m.donor.last_name}`
                        : `Anonymous Donor #${m.donor.id.substring(0, 4).toUpperCase()}`}
                    </div>
                    <div className="migrated-51a835e5">
                      {m.donor.location_city}
                      {m.donor.donor_profile?.is_blood_donor
                        ? " · Blood Donor"
                        : ""}
                      {m.donor.donor_profile?.organ_pledges?.length > 0
                        ? ` · ${m.donor.donor_profile.organ_pledges.join(", ")}`
                        : ""}
                    </div>
                  </div>
                  <div className="compat-wrap migrated-1117ac49">
                    <div className="compat-header">
                      <span className="compat-label">Match</span>
                      <span
                        className="compat-value"
                        style={{ color: scoreColor }}
                      >
                        {score}%
                      </span>
                    </div>
                    <div className="compat-track">
                      <div
                        className={`compat-fill compat-${tier}`}
                        style={{ width: `${score}%` }}
                      />
                    </div>
                  </div>
                  {m.donor.everify_status === "verified" ? (
                    <span className="badge badge-verified">
                      Demo identity profile
                    </span>
                  ) : (
                    <span className="badge badge-muted">
                      Identity not verified
                    </span>
                  )}
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMatch(m);
                    }}
                  >
                    Match →
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {matches.length === 0 && !loading && (
        <div className="empty-state">
          <div className="migrated-751f33f3">
            <SearchIcon />
          </div>
          <h3>No donors yet</h3>
          <p>Run a search above to find compatible blood or organ donors</p>
        </div>
      )}
    </div>
  );
}

export function MatchPendingStep({
  selectedMatch,
  params,
  consentSigned,
  setStep,
  setSelectedMatch,
}) {
  return (
    <div className="migrated-98c4742c">
      <div className="card anim-up migrated-5beafa4c">
        <div className="migrated-f7d7c05f">
          <div className="migrated-f087ef8e">⏳</div>
          <div>
            <div className="migrated-0f22e7d6">
              Match Requested — Awaiting Hospital Demo Review
            </div>
            <div className="migrated-663c703d">
              Your request is shown in the hospital administrator demo review
              queue.
            </div>
          </div>
        </div>

        <div className="migrated-d125a56e">
          <div className="migrated-45ac9f42">
            <div
              className={`blood-pill migrated-40c5b14b ${params.request_type === "organ" ? "blood-pill-organ" : "blood-pill-blood"}`}
            >
              {selectedMatch.donor.blood_type}
            </div>
            <div className="migrated-7e90f870">
              <div className="migrated-39fc62a1">
                {consentSigned
                  ? `${selectedMatch.donor.first_name} ${selectedMatch.donor.last_name}`
                  : `Anonymous Donor #${selectedMatch.donor.id.substring(0, 4).toUpperCase()}`}
              </div>
              <div className="migrated-bd45f3c8">
                {selectedMatch.donor.location_city} ·{" "}
                {params.request_type === "organ"
                  ? params.organ_needed
                  : "Blood"}{" "}
                · {selectedMatch.compatibilityScore}% Match
              </div>
            </div>
            <span className="badge badge-urgent">Pending Review</span>
          </div>

          <div className="migrated-b3dee9c4">
            <div className="migrated-dce169d0">
              <strong className="migrated-64098849">
                🏥 Awaiting PGH demo review
              </strong>
              A hospital administrator can complete this prototype review via{" "}
              <code>/hospital-dashboard</code>. It is not doctor-issued clinical
              clearance and does not authorize treatment.
            </div>
            <div className="migrated-df58e7a2">
              <span className="migrated-21ffebb9">
                Expected review: Within 24 hours
              </span>
              <button
                className="btn btn-outline btn-sm"
                onClick={() => {
                  setStep("find");
                  setSelectedMatch(null);
                }}
              >
                <SearchIcon /> Find Another
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="migrated-8a78b4b0">
        <strong>Sample clinical context:</strong> Real matching would require
        qualified clinicians to review compatibility and fitness. This prototype
        does not evaluate HLA, crossmatch results, or surgical fitness.
      </div>
    </div>
  );
}
