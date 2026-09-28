import "../../styles/components/donor/DonorTabComponents.css";
import { CheckIcon } from "../../components/ui/Icons";
type DonorProfileProps = {
  avail: boolean;
  setAvail: (value: boolean | ((value: boolean) => boolean)) => void;
  bloodType: string;
  setBloodType: (value: string) => void;
  isBlood: boolean;
  setIsBlood: (value: boolean | ((value: boolean) => boolean)) => void;
  organs: string[];
  toggleOrgan: (organ: string) => void;
  saveProfile: () => void;
  BLOOD_TYPES: string[];
  ALL_ORGANS: string[];
};

export function DonorProfileTab({
  avail,
  setAvail,
  bloodType,
  setBloodType,
  isBlood,
  setIsBlood,
  organs,
  toggleOrgan,
  saveProfile,
  BLOOD_TYPES,
  ALL_ORGANS,
}: DonorProfileProps) {
  return (
    <div className="migrated-21b3263f">
      <div className="card anim-up">
        <div className="migrated-d35325e3">
          <div className="migrated-f875b2f9">J</div>
          <div>
            <div className="migrated-f7b61a15">Juan Dela Cruz</div>
            <div className="migrated-7d8107a4">
              <span className="badge badge-verified">
                Demo identity profile
              </span>
              <span
                className={`badge ${avail ? "badge-success" : "badge-muted"}`}
              >
                {avail ? "● Available" : "○ Unavailable"}
              </span>
            </div>
          </div>
          <div className="migrated-6dac5f26">
            <div className="toggle-wrap">
              <span className="migrated-bd45f3c8">Availability</span>
              <button
                type="button"
                className={`toggle ${avail ? "on" : "off"}`}
                onClick={() => setAvail((v) => !v)}
                aria-label="Toggle availability"
                aria-pressed={avail}
              >
                <div className="toggle-knob" />
              </button>
            </div>
          </div>
        </div>
        <div className="grid-2">
          <div className="field">
            <label className="label" htmlFor="donor-blood-type">
              Blood Type
            </label>
            <select
              id="donor-blood-type"
              className="input"
              value={bloodType}
              onChange={(e) => setBloodType(e.target.value)}
            >
              {BLOOD_TYPES.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <span className="label">Blood Donor Status</span>
            <div className="migrated-86a9e904">
              <div className="toggle-wrap">
                <button
                  type="button"
                  className={`toggle ${isBlood ? "on" : "off"}`}
                  onClick={() => setIsBlood((v) => !v)}
                  aria-label="Toggle blood donor"
                  aria-pressed={isBlood}
                >
                  <div className="toggle-knob" />
                </button>
                <span className="migrated-48613e4d">
                  {isBlood ? "Registered blood donor" : "Not registered"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="card anim-up-d1">
        <div className="section-title">Organ Donation Pledges</div>
        <div className="migrated-b822dd5d">
          {ALL_ORGANS.map((organ) => {
            const pledged = organs.includes(organ);
            return (
              <button
                type="button"
                key={organ}
                className="organ-pledge-button"
                aria-pressed={pledged}
                onClick={() => toggleOrgan(organ)}
                style={{
                  border: `1.5px solid ${pledged ? "rgba(5,150,105,0.4)" : "var(--border)"}`,
                  background: pledged
                    ? "rgba(5,150,105,0.06)"
                    : "var(--background-alt)",
                  color: pledged ? "var(--emerald)" : "var(--foreground-muted)",
                }}
              >
                {pledged && <CheckIcon />}
                {organ[0].toUpperCase() + organ.slice(1)}
              </button>
            );
          })}
        </div>
        <div className="migrated-8a78b4b0">
          Organ pledges are sample data for this prototype. The demo does not
          verify identity or create a legal consent record.
        </div>
      </div>

      <button
        className="btn btn-primary btn-lg btn-full anim-up-d2"
        onClick={saveProfile}
      >
        <CheckIcon /> Save Profile Changes
      </button>
    </div>
  );
}
