import "../../styles/components/recipient/RecipientHealthForm.css";
import React from "react";
import Stepper from "../onboarding/Stepper";
import { INTAKE_ORGANS } from "../../services/platformApi";

type RecipientHealth = {
  request_type: string;
  blood_type_needed: string;
  organ_needed: string;
  urgency_level: string;
};

type RecipientHealthFormProps = {
  recipientHealth: RecipientHealth;
  setRecipientHealth: React.Dispatch<React.SetStateAction<RecipientHealth>>;
  onSubmit: React.FormEventHandler<HTMLFormElement>;
  onBack: () => void;
};

export default function RecipientHealthForm({
  recipientHealth,
  setRecipientHealth,
  onSubmit,
  onBack,
}: RecipientHealthFormProps) {
  return (
    <div className="anim-in">
      <Stepper active={5} />
      <h3 className="migrated-1f2c3427">Recipient Health Details (Demo)</h3>
      <p className="migrated-e3448519">
        Enter the minimum coordination details for this prototype journey. This
        is not a medical assessment or a live transplant request.
      </p>
      <form onSubmit={onSubmit} className="migrated-039dd51e">
        <div className="grid-2">
          <div className="field">
            <label className="label" htmlFor="recipient-request-type">
              Need Category
            </label>
            <select
              id="recipient-request-type"
              className="input"
              value={recipientHealth.request_type}
              onChange={(event) =>
                setRecipientHealth({
                  ...recipientHealth,
                  request_type: event.target.value,
                })
              }
            >
              <option value="organ">Organ Transplant</option>
              <option value="blood">Blood Transfusion</option>
            </select>
          </div>

          {recipientHealth.request_type === "organ" ? (
            <div className="field">
              <label className="label" htmlFor="recipient-organ-needed">
                Organ Needed
              </label>
              <select
                id="recipient-organ-needed"
                className="input"
                value={recipientHealth.organ_needed}
                onChange={(event) =>
                  setRecipientHealth({
                    ...recipientHealth,
                    organ_needed: event.target.value,
                  })
                }
              >
                {INTAKE_ORGANS.map((organ) => (
                  <option key={organ} value={organ}>
                    {organ.charAt(0).toUpperCase() + organ.slice(1)}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="field">
              <label className="label" htmlFor="recipient-blood-type-needed">
                Blood Type Needed
              </label>
              <select
                id="recipient-blood-type-needed"
                className="input"
                value={recipientHealth.blood_type_needed}
                onChange={(event) =>
                  setRecipientHealth({
                    ...recipientHealth,
                    blood_type_needed: event.target.value,
                  })
                }
              >
                {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map(
                  (type) => (
                    <option key={type}>{type}</option>
                  ),
                )}
              </select>
            </div>
          )}
        </div>

        <div className="field">
          <label className="label" htmlFor="recipient-urgency-level">
            Urgency Priority
          </label>
          <select
            id="recipient-urgency-level"
            className="input"
            value={recipientHealth.urgency_level}
            onChange={(event) =>
              setRecipientHealth({
                ...recipientHealth,
                urgency_level: event.target.value,
              })
            }
          >
            <option value="moderate">Moderate (Standard)</option>
            <option value="urgent">Urgent Need</option>
            <option value="critical">Critical (ICU / Active Support)</option>
          </select>
        </div>

        {(recipientHealth.urgency_level === "critical" ||
          recipientHealth.urgency_level === "urgent") && (
          <div className="emergency-care-alert" role="alert">
            <strong>Emergency Care Notice:</strong> If you or the recipient are
            experiencing an acute medical crisis, please call emergency services
            (911) or proceed immediately to the nearest hospital emergency room.
            eBuhay is a care coordination scheduling platform and does not
            provide urgent emergency medical response.
          </div>
        )}

        <div className="migrated-cac93c16">
          <button
            className="btn btn-ghost migrated-7e90f870"
            type="button"
            onClick={onBack}
          >
            Back
          </button>
          <button className="btn btn-primary migrated-b3730661" type="submit">
            Save Details &amp; Enter Portal
          </button>
        </div>
      </form>
    </div>
  );
}
