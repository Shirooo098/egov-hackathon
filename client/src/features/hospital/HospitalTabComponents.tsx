import type { ReactElement } from "react";
import "../../styles/components/hospital/HospitalTabComponents.css";

export interface SyntheticCompatibilityFixture {
  id: string;
  organ: "Kidney" | "Liver" | "Heart" | "Lung" | "Pancreas";
  syntheticDonorRef: string;
  syntheticRecipientRef: string;
  donorBloodType: string;
  recipientBloodType: string;
  whySurfaced: string;
  missingReviewItems: readonly string[];
  prototypeVersion: string;
}

export const RESEARCH_MOCKUP_DISCLAIMER =
  "Unvalidated research mockup—synthetic data only. Not for compatibility, allocation, or clinical use.";

export const SYNTHETIC_COMPATIBILITY_FIXTURES: readonly SyntheticCompatibilityFixture[] = [
  {
    id: "compat-fixture-kidney",
    organ: "Kidney",
    syntheticDonorRef: "SYN-DON-KIDNEY-101",
    syntheticRecipientRef: "SYN-REC-KIDNEY-201",
    donorBloodType: "O+",
    recipientBloodType: "O+",
    whySurfaced:
      "Simulated protocol demonstration pairing for blood type O concordance under synthetic evaluation criteria.",
    missingReviewItems: [
      "Laboratory crossmatch testing unrecorded",
      "HLA tissue typing data uncollected",
      "Independent staff review pending",
    ],
    prototypeVersion: "v0.9-research",
  },
  {
    id: "compat-fixture-liver",
    organ: "Liver",
    syntheticDonorRef: "SYN-DON-LIVER-102",
    syntheticRecipientRef: "SYN-REC-LIVER-202",
    donorBloodType: "A+",
    recipientBloodType: "A+",
    whySurfaced:
      "Simulated graft parameters compared against synthetic records for exploratory layout demonstration.",
    missingReviewItems: [
      "Anatomical volume assessment incomplete",
      "Simulated laboratory panel unreviewed",
      "Transplant center administrative sign-off pending",
    ],
    prototypeVersion: "v0.9-research",
  },
  {
    id: "compat-fixture-heart",
    organ: "Heart",
    syntheticDonorRef: "SYN-DON-HEART-103",
    syntheticRecipientRef: "SYN-REC-HEART-203",
    donorBloodType: "B-",
    recipientBloodType: "B-",
    whySurfaced:
      "Exploratory research data demonstrating thoracic layout formatting in synthetic environments.",
    missingReviewItems: [
      "Simulated ischemic window assessment missing",
      "Cardiology peer consultation unrecorded",
      "Research protocol adherence review incomplete",
    ],
    prototypeVersion: "v0.9-research",
  },
  {
    id: "compat-fixture-lung",
    organ: "Lung",
    syntheticDonorRef: "SYN-DON-LUNG-104",
    syntheticRecipientRef: "SYN-REC-LUNG-204",
    donorBloodType: "O-",
    recipientBloodType: "O-",
    whySurfaced:
      "Surfaced to evaluate staff presentation of mock pulmonary records without clinical evaluation.",
    missingReviewItems: [
      "Simulated pulmonary mechanics report missing",
      "Multidisciplinary review pending",
      "Synthetic baseline documentation unresolved",
    ],
    prototypeVersion: "v0.9-research",
  },
  {
    id: "compat-fixture-pancreas",
    organ: "Pancreas",
    syntheticDonorRef: "SYN-DON-PANCREAS-105",
    syntheticRecipientRef: "SYN-REC-PANCREAS-205",
    donorBloodType: "AB+",
    recipientBloodType: "AB+",
    whySurfaced:
      "Displayed to inspect multi-organ layout rendering in the unvalidated research mockup view.",
    missingReviewItems: [
      "Endocrine assessment checklist unreviewed",
      "Institutional research protocol oversight pending",
      "Synthetic donor record verification pending",
    ],
    prototypeVersion: "v0.9-research",
  },
];

export function ExperimentalCompatibilityPanel(): ReactElement {
  return (
    <section
      className="card experimental-compatibility-panel"
      aria-labelledby="experimental-compatibility-heading"
    >
      <div className="experimental-compatibility-header">
        <div className="experimental-badge-wrap">
          <span className="badge badge-warning">Hospital Staff Read-Only Preview</span>
          <span className="badge">Synthetic Mockup</span>
        </div>
        <h2 id="experimental-compatibility-heading">
          Experimental Compatibility Suggestions
        </h2>
        <p className="experimental-compatibility-subhead">
          Static demonstration suggestions for research and workflow exploration only.
          This panel is unranked, non-clinical, and disconnected from hospital candidate allocation.
        </p>
      </div>

      <div
        className="experimental-disclaimer-banner"
        role="note"
        aria-label="Research disclaimer"
      >
        <strong>{RESEARCH_MOCKUP_DISCLAIMER}</strong>
      </div>

      <div
        className="experimental-fixtures-list"
        role="list"
        aria-label="Synthetic experimental compatibility suggestions"
      >
        {SYNTHETIC_COMPATIBILITY_FIXTURES.map((fixture) => (
          <article
            key={fixture.id}
            className="card experimental-fixture-card"
            role="listitem"
            aria-labelledby={`fixture-heading-${fixture.id}`}
          >
            <div className="fixture-card-header">
              <h3
                id={`fixture-heading-${fixture.id}`}
                className="fixture-organ"
              >
                {fixture.organ}
              </h3>
              <span className="fixture-version">
                Prototype {fixture.prototypeVersion}
              </span>
            </div>

            <div className="fixture-details">
              <div className="fixture-row">
                <span className="fixture-label">Synthetic Donor Reference:</span>
                <code className="fixture-value">{fixture.syntheticDonorRef}</code>
              </div>
              <div className="fixture-row">
                <span className="fixture-label">Synthetic Recipient Reference:</span>
                <code className="fixture-value">{fixture.syntheticRecipientRef}</code>
              </div>
              <div className="fixture-row">
                <span className="fixture-label">Fictional Blood Types:</span>
                <span className="fixture-value">
                  Donor {fixture.donorBloodType} → Recipient {fixture.recipientBloodType}
                </span>
              </div>
            </div>

            <div className="fixture-section">
              <h4 className="fixture-section-title">Why surfaced</h4>
              <p className="fixture-why">{fixture.whySurfaced}</p>
            </div>

            <div className="fixture-section">
              <h4 className="fixture-section-title">Missing-review items</h4>
              <ul className="fixture-missing-list">
                {fixture.missingReviewItems.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>

            <div className="fixture-footer-disclaimer" role="note">
              <small>{RESEARCH_MOCKUP_DISCLAIMER}</small>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
