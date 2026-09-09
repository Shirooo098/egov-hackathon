import "../../styles/components/recipient/RecipientHealthForm.css";
import React from "react";
import SignatureUploader from "../match/SignatureUploader";

export default function RecipientHealthForm({
  recipientHealth,
  setRecipientHealth,
  onSubmit,
  onBack,
}) {
  return (
    <div className="anim-in">
      <h3 className="migrated-1f2c3427">Recipient Health Details (Demo)</h3>
      <p className="migrated-e3448519">
        Enter sample details for this prototype journey. This is not a medical
        assessment or a live transplant request.
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
              onChange={(e) =>
                setRecipientHealth({
                  ...recipientHealth,
                  request_type: e.target.value,
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
                onChange={(e) =>
                  setRecipientHealth({
                    ...recipientHealth,
                    organ_needed: e.target.value,
                  })
                }
              >
                <option value="kidney">Kidney</option>
                <option value="liver">Liver</option>
                <option value="cornea">Cornea</option>
                <option value="heart">Heart</option>
                <option value="lung">Lung</option>
                <option value="pancreas">Pancreas</option>
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
                onChange={(e) =>
                  setRecipientHealth({
                    ...recipientHealth,
                    blood_type_needed: e.target.value,
                  })
                }
              >
                {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="grid-2">
          <div className="field">
            <label className="label" htmlFor="recipient-urgency-level">
              Urgency Priority
            </label>
            <select
              id="recipient-urgency-level"
              className="input"
              value={recipientHealth.urgency_level}
              onChange={(e) =>
                setRecipientHealth({
                  ...recipientHealth,
                  urgency_level: e.target.value,
                })
              }
            >
              <option value="moderate">Moderate (Standard)</option>
              <option value="urgent">Urgent Need</option>
              <option value="critical">Critical (ICU / Active Support)</option>
            </select>
          </div>
          <div className="field">
            <label className="label" htmlFor="recipient-dialysis">
              Currently on Dialysis/Support?
            </label>
            <select
              id="recipient-dialysis"
              className="input"
              value={recipientHealth.dialysis}
              onChange={(e) =>
                setRecipientHealth({
                  ...recipientHealth,
                  dialysis: e.target.value,
                })
              }
            >
              <option value="no">No</option>
              <option value="yes">Yes</option>
            </select>
          </div>
        </div>

        <div className="field">
          <label className="label" htmlFor="recipient-conditions">
            Pre-existing Medical Conditions / Clinical Notes
          </label>
          <textarea
            id="recipient-conditions"
            className="input"
            rows={3}
            placeholder="Detail chronic illnesses, previous transplant surgeries, or clinical allergies..."
            value={recipientHealth.conditions}
            onChange={(e) =>
              setRecipientHealth({
                ...recipientHealth,
                conditions: e.target.value,
              })
            }
          />
        </div>

        <fieldset className="field migrated-935c9a35">
          <legend className="label migrated-6fd9c109">
            1. Past Medical Record / Lab Documentation
          </legend>
          <p className="migrated-b3fb5549">
            For this demo, upload a sample document or choose a sample
            consultation slot.
          </p>
          <div className="migrated-ed02fd54">
            <button
              type="button"
              className={`btn btn-sm migrated-7e90f870 ${recipientHealth.hasMedicalRecord === "yes" ? "btn-primary" : "btn-outline"}`}
              onClick={() =>
                setRecipientHealth({
                  ...recipientHealth,
                  hasMedicalRecord: "yes",
                  requiresDiagnosis: false,
                })
              }
            >
              Yes, Upload Record (PDF)
            </button>
            <button
              type="button"
              className={`btn btn-sm migrated-7e90f870 ${recipientHealth.hasMedicalRecord === "no" ? "btn-primary" : "btn-outline"}`}
              onClick={() =>
                setRecipientHealth({
                  ...recipientHealth,
                  hasMedicalRecord: "no",
                  requiresDiagnosis: true,
                  medicalRecordFile: null,
                })
              }
            >
              No, Schedule Diagnosis
            </button>
          </div>

          {recipientHealth.hasMedicalRecord === "yes" ? (
            <SignatureUploader
              variant="medical"
              title="Upload Medical Record"
              subtitle="Supports PNG, JPG, or PDF lab / medical documents (max 5MB)"
              uploadingLabel="Uploading medical record..."
              statusLabel="medical record"
              onUploadComplete={(file) =>
                setRecipientHealth({
                  ...recipientHealth,
                  medicalRecordFile: file.name,
                  requiresDiagnosis: false,
                })
              }
              onClear={() =>
                setRecipientHealth({
                  ...recipientHealth,
                  medicalRecordFile: null,
                })
              }
            />
          ) : (
            <div className="migrated-67214d76">
              <div className="migrated-642b12a6">
                <span>⚠️ Choose a Demo Consultation Slot</span>
              </div>
              <div className="grid-2">
                <div className="field">
                  <label
                    className="label migrated-000d1144"
                    htmlFor="recipient-specialty"
                  >
                    Attending Specialty
                  </label>
                  <select
                    id="recipient-specialty"
                    className="input migrated-d8c077b1"
                    value={
                      recipientHealth.hospitalSpecialty ||
                      recipientHealth.doctorSpecialty ||
                      "General Diagnostic Specialist"
                    }
                    onChange={(e) =>
                      setRecipientHealth({
                        ...recipientHealth,
                        hospitalSpecialty: e.target.value,
                        doctorSpecialty: e.target.value,
                      })
                    }
                  >
                    <option value="General Diagnostic Specialist">
                      General Diagnostic Specialist
                    </option>
                    <option value="Nephrology Unit (Kidney)">
                      Nephrology Unit (Kidney)
                    </option>
                    <option value="Hepatology Unit (Liver)">
                      Hepatology Unit (Liver)
                    </option>
                    <option value="Ophthalmology Unit (Cornea)">
                      Ophthalmology Unit (Cornea)
                    </option>
                    <option value="Cardiology Unit (Heart)">
                      Cardiology Unit (Heart)
                    </option>
                  </select>
                </div>
                <div className="field">
                  <label
                    className="label migrated-000d1144"
                    htmlFor="recipient-appointment-date"
                  >
                    Consultation Date
                  </label>
                  <input
                    id="recipient-appointment-date"
                    className="input migrated-d8c077b1"
                    type="date"
                    value={recipientHealth.appointmentDate}
                    onChange={(e) =>
                      setRecipientHealth({
                        ...recipientHealth,
                        appointmentDate: e.target.value,
                      })
                    }
                  />
                </div>
              </div>
              <div className="field">
                <label
                  className="label migrated-000d1144"
                  htmlFor="recipient-appointment-time"
                >
                  Preferred Time Slot
                </label>
                <select
                  id="recipient-appointment-time"
                  className="input migrated-d8c077b1"
                  value={recipientHealth.appointmentTime}
                  onChange={(e) =>
                    setRecipientHealth({
                      ...recipientHealth,
                      appointmentTime: e.target.value,
                    })
                  }
                >
                  <option value="09:00 AM - 10:00 AM">
                    09:00 AM - 10:00 AM (Morning Slot)
                  </option>
                  <option value="10:30 AM - 11:30 AM">
                    10:30 AM - 11:30 AM (Morning Slot)
                  </option>
                  <option value="02:00 PM - 03:00 PM">
                    02:00 PM - 03:00 PM (Afternoon Slot)
                  </option>
                  <option value="03:30 PM - 04:30 PM">
                    03:30 PM - 04:30 PM (Afternoon Slot)
                  </option>
                </select>
              </div>
              <div className="migrated-78e40e53">
                <span>📅 Demo slot:</span>
                <strong className="migrated-40acd791">
                  {recipientHealth.appointmentDate} @{" "}
                  {recipientHealth.appointmentTime} (
                  {recipientHealth.hospitalSpecialty ||
                    recipientHealth.doctorSpecialty}
                  )
                </strong>
              </div>
            </div>
          )}
        </fieldset>

        <fieldset className="field migrated-935c9a35">
          <legend className="label migrated-6fd9c109">
            2. Mandatory Recipient Digital Signature Document (PDF or Image)
          </legend>
          <p className="migrated-b3fb5549">
            Upload a sample signature document to complete this prototype step.
            It does not authorize a live medical request.
          </p>
          <SignatureUploader
            variant="signature"
            title="Upload E-Signature"
            subtitle="Supports PNG, JPG, or PDF (max 5MB)"
            uploadingLabel="Uploading signature document..."
            statusLabel="e-signed"
            onUploadComplete={(file) =>
              setRecipientHealth({
                ...recipientHealth,
                signatureFile: file.name,
              })
            }
            onClear={() =>
              setRecipientHealth({ ...recipientHealth, signatureFile: null })
            }
          />
        </fieldset>

        <div className="migrated-cac93c16">
          <button
            className="btn btn-ghost migrated-7e90f870"
            type="button"
            onClick={onBack}
          >
            Back
          </button>
          <button
            className="btn btn-primary migrated-b3730661"
            type="submit"
            disabled={!recipientHealth.signatureFile}
          >
            {recipientHealth.hasMedicalRecord === "no"
              ? "Save Demo Slot & Enter Portal →"
              : "Save Demo Details & Enter Portal"}
          </button>
        </div>
      </form>
    </div>
  );
}
