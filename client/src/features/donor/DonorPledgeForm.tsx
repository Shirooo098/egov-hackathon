import "../../styles/components/donor/DonorPledgeForm.css";
import React from "react";
import Stepper from "../onboarding/Stepper";
import { INTAKE_ORGANS } from "../../services/platformApi";

type Pledge = { bloodType: string; organs: string[]; ageConsent: boolean };
type Props = {
  donorPledge: Pledge;
  setDonorPledge: (value: Pledge) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onBack: () => void;
  savingPledge: boolean;
  pledgeError?: string;
};
export default function DonorPledgeForm({
  donorPledge,
  setDonorPledge,
  onSubmit,
  onBack,
  savingPledge,
  pledgeError,
}: Props) {
  return (
    <div className="anim-in">
      <Stepper active={5} />
      <h3 className="migrated-1f2c3427">Donor Pledge (Demo)</h3>
      <p className="migrated-78d8b799">
        Review a sample pledge for this prototype journey. It is not a legal
        registration and is not stored in a national registry.
      </p>

      <form onSubmit={onSubmit} className="migrated-039dd51e">
        <div className="migrated-fd720fd5">
          <div className="migrated-20dcf194">
            <span className="migrated-e72f3736">My Pledged Organs</span>
            <div className="migrated-702ab413">
              <label className="migrated-e5022c59" htmlFor="donor-blood-type">
                Blood Type:
              </label>
              <select
                id="donor-blood-type"
                className="input migrated-763aa118"
                value={donorPledge.bloodType}
                onChange={(event) =>
                  setDonorPledge({
                    ...donorPledge,
                    bloodType: event.target.value,
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
          </div>
          <div
            className="migrated-5f18923c"
            role="group"
            aria-label="Pledged organs"
          >
            {INTAKE_ORGANS.map((organ) => {
              const active = donorPledge.organs.includes(organ);
              return (
                <button
                  key={organ}
                  type="button"
                  aria-pressed={active}
                  onClick={() => {
                    const organs = active
                      ? donorPledge.organs.filter((value) => value !== organ)
                      : [...donorPledge.organs, organ];
                    setDonorPledge({ ...donorPledge, organs });
                  }}
                  className={`btn btn-sm migrated-5d4df660 ${active ? "btn-primary" : "btn-outline"}`}
                >
                  {organ}
                </button>
              );
            })}
          </div>
        </div>

        <div className="field migrated-cc187a47">
          <input
            type="checkbox"
            id="ageConsent"
            required
            checked={donorPledge.ageConsent}
            onChange={(event) =>
              setDonorPledge({
                ...donorPledge,
                ageConsent: event.target.checked,
              })
            }
            className="migrated-d2a1a31b"
          />
          <label htmlFor="ageConsent" className="migrated-cd1c6985">
            For this demo, I confirm that I am 18 or older and choose to
            participate in this sample donor intake.
          </label>
        </div>

        {savingPledge && (
          <div className="card anim-in migrated-32e14a60" role="status">
            <div className="spinner migrated-791c71cb" />
            <span className="migrated-a54e6f50">
              Saving the sample pledge...
            </span>
          </div>
        )}

        {pledgeError && !savingPledge && (
          <p role="alert" className="migrated-729dd964">
            {pledgeError} Check your connection and select “Submit Demo Pledge”
            to retry.
          </p>
        )}

        <div className="migrated-888b2c34">
          <button
            className="btn btn-ghost migrated-7e90f870"
            type="button"
            onClick={onBack}
            disabled={savingPledge}
          >
            Back
          </button>
          <button
            className="btn btn-primary migrated-b3730661"
            type="submit"
            disabled={savingPledge || !donorPledge.ageConsent}
          >
            Submit Demo Pledge
          </button>
        </div>
      </form>
    </div>
  );
}
