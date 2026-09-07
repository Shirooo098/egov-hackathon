import React from 'react';
import SignatureUploader from './SignatureUploader';

export default function RecipientHealthForm({
  recipientHealth,
  setRecipientHealth,
  onSubmit,
  onBack,
}) {
  return (
    <div className="anim-in">
      <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 8, textAlign: 'center' }}>Recipient Health Details (Demo)</h3>
      <p style={{ fontSize: 13, color: 'var(--foreground-muted)', textAlign: 'center', marginBottom: 18 }}>Enter sample details for this prototype journey. This is not a medical assessment or a live transplant request.</p>
      <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div className="grid-2">
          <div className="field">
            <label className="label" htmlFor="recipient-request-type">Need Category</label>
            <select
              id="recipient-request-type" className="input"
              value={recipientHealth.request_type}
              onChange={e => setRecipientHealth({ ...recipientHealth, request_type: e.target.value })}
            >
              <option value="organ">Organ Transplant</option>
              <option value="blood">Blood Transfusion</option>
            </select>
          </div>

          {recipientHealth.request_type === 'organ' ? (
            <div className="field">
              <label className="label" htmlFor="recipient-organ-needed">Organ Needed</label>
              <select
                id="recipient-organ-needed" className="input"
                value={recipientHealth.organ_needed}
                onChange={e => setRecipientHealth({ ...recipientHealth, organ_needed: e.target.value })}
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
              <label className="label" htmlFor="recipient-blood-type-needed">Blood Type Needed</label>
              <select
                id="recipient-blood-type-needed" className="input"
                value={recipientHealth.blood_type_needed}
                onChange={e => setRecipientHealth({ ...recipientHealth, blood_type_needed: e.target.value })}
              >
                {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
          )}
        </div>

        <div className="grid-2">
          <div className="field">
            <label className="label" htmlFor="recipient-urgency-level">Urgency Priority</label>
            <select
              id="recipient-urgency-level" className="input"
              value={recipientHealth.urgency_level}
              onChange={e => setRecipientHealth({ ...recipientHealth, urgency_level: e.target.value })}
            >
              <option value="moderate">Moderate (Standard)</option>
              <option value="urgent">Urgent Need</option>
              <option value="critical">Critical (ICU / Active Support)</option>
            </select>
          </div>
          <div className="field">
            <label className="label" htmlFor="recipient-dialysis">Currently on Dialysis/Support?</label>
            <select
              id="recipient-dialysis" className="input"
              value={recipientHealth.dialysis}
              onChange={e => setRecipientHealth({ ...recipientHealth, dialysis: e.target.value })}
            >
              <option value="no">No</option>
              <option value="yes">Yes</option>
            </select>
          </div>
        </div>

        <div className="field">
          <label className="label" htmlFor="recipient-conditions">Pre-existing Medical Conditions / Clinical Notes</label>
          <textarea
            id="recipient-conditions" className="input"
            rows={3}
            placeholder="Detail chronic illnesses, previous transplant surgeries, or clinical allergies..."
            value={recipientHealth.conditions}
            onChange={e => setRecipientHealth({ ...recipientHealth, conditions: e.target.value })}
          />
        </div>

        <fieldset className="field" style={{ border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: 16, background: 'white' }}>
          <legend className="label" style={{ marginBottom: 4 }}>1. Past Medical Record / Lab Documentation</legend>
          <p style={{ fontSize: 12, color: 'var(--foreground-muted)', marginBottom: 12 }}>
            For this demo, upload a sample document or choose a sample consultation slot.
          </p>
          <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
            <button
              type="button"
              className={`btn btn-sm ${recipientHealth.hasMedicalRecord === 'yes' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setRecipientHealth({ ...recipientHealth, hasMedicalRecord: 'yes', requiresDiagnosis: false })}
              style={{ flex: 1 }}
            >
              Yes, Upload Record (PDF)
            </button>
            <button
              type="button"
              className={`btn btn-sm ${recipientHealth.hasMedicalRecord === 'no' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setRecipientHealth({ ...recipientHealth, hasMedicalRecord: 'no', requiresDiagnosis: true, medicalRecordFile: null })}
              style={{ flex: 1 }}
            >
              No, Schedule Diagnosis
            </button>
          </div>

          {recipientHealth.hasMedicalRecord === 'yes' ? (
            <SignatureUploader
              variant="medical"
              title="Upload Medical Record"
              subtitle="Supports PNG, JPG, or PDF lab / medical documents (max 5MB)"
              uploadingLabel="Uploading medical record..."
              statusLabel="medical record"
              onUploadComplete={(file) => setRecipientHealth({ ...recipientHealth, medicalRecordFile: file.name, requiresDiagnosis: false })}
              onClear={() => setRecipientHealth({ ...recipientHealth, medicalRecordFile: null })}
            />
          ) : (
            <div style={{ padding: 14, background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.25)', borderRadius: 'var(--r-md)', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ fontWeight: 700, color: 'var(--sun)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>⚠️ Choose a Demo Consultation Slot</span>
              </div>
              <div className="grid-2">
                <div className="field">
                  <label className="label" htmlFor="recipient-specialty" style={{ fontSize: 11 }}>Attending Specialty</label>
                  <select
                    id="recipient-specialty" className="input"
                    style={{ height: 34, fontSize: 12 }}
                    value={recipientHealth.hospitalSpecialty || recipientHealth.doctorSpecialty || "General Diagnostic Specialist"}
                    onChange={e => setRecipientHealth({ ...recipientHealth, hospitalSpecialty: e.target.value, doctorSpecialty: e.target.value })}
                  >
                    <option value="General Diagnostic Specialist">General Diagnostic Specialist</option>
                    <option value="Nephrology Unit (Kidney)">Nephrology Unit (Kidney)</option>
                    <option value="Hepatology Unit (Liver)">Hepatology Unit (Liver)</option>
                    <option value="Ophthalmology Unit (Cornea)">Ophthalmology Unit (Cornea)</option>
                    <option value="Cardiology Unit (Heart)">Cardiology Unit (Heart)</option>
                  </select>
                </div>
                <div className="field">
                <label className="label" htmlFor="recipient-appointment-date" style={{ fontSize: 11 }}>Consultation Date</label>
                  <input
                    id="recipient-appointment-date" className="input"
                    type="date"
                    style={{ height: 34, fontSize: 12 }}
                    value={recipientHealth.appointmentDate}
                    onChange={e => setRecipientHealth({ ...recipientHealth, appointmentDate: e.target.value })}
                  />
                </div>
              </div>
              <div className="field">
                <label className="label" htmlFor="recipient-appointment-time" style={{ fontSize: 11 }}>Preferred Time Slot</label>
                <select
                  id="recipient-appointment-time" className="input"
                  style={{ height: 34, fontSize: 12 }}
                  value={recipientHealth.appointmentTime}
                  onChange={e => setRecipientHealth({ ...recipientHealth, appointmentTime: e.target.value })}
                >
                  <option value="09:00 AM - 10:00 AM">09:00 AM - 10:00 AM (Morning Slot)</option>
                  <option value="10:30 AM - 11:30 AM">10:30 AM - 11:30 AM (Morning Slot)</option>
                  <option value="02:00 PM - 03:00 PM">02:00 PM - 03:00 PM (Afternoon Slot)</option>
                  <option value="03:30 PM - 04:30 PM">03:30 PM - 04:30 PM (Afternoon Slot)</option>
                </select>
              </div>
              <div style={{ padding: '8px 12px', background: 'white', borderRadius: 'var(--r-sm)', border: '1px solid var(--border)', fontSize: 11, color: 'var(--foreground-subtle)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>📅 Demo slot:</span>
                <strong style={{ color: 'var(--primary)' }}>{recipientHealth.appointmentDate} @ {recipientHealth.appointmentTime} ({recipientHealth.hospitalSpecialty || recipientHealth.doctorSpecialty})</strong>
              </div>
            </div>
          )}
        </fieldset>

        <fieldset className="field" style={{ border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: 16, background: 'white' }}>
          <legend className="label" style={{ marginBottom: 4 }}>2. Mandatory Recipient Digital Signature Document (PDF or Image)</legend>
          <p style={{ fontSize: 12, color: 'var(--foreground-muted)', marginBottom: 12 }}>
            Upload a sample signature document to complete this prototype step. It does not authorize a live medical request.
          </p>
          <SignatureUploader
            variant="signature"
            title="Upload E-Signature"
            subtitle="Supports PNG, JPG, or PDF (max 5MB)"
            uploadingLabel="Uploading signature document..."
            statusLabel="e-signed"
            onUploadComplete={(file) => setRecipientHealth({ ...recipientHealth, signatureFile: file.name })}
            onClear={() => setRecipientHealth({ ...recipientHealth, signatureFile: null })}
          />
        </fieldset>

        <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
          <button className="btn btn-ghost" type="button" onClick={onBack} style={{ flex: 1 }}>Back</button>
          <button className="btn btn-primary" type="submit" style={{ flex: 2 }} disabled={!recipientHealth.signatureFile}>
            {recipientHealth.hasMedicalRecord === 'no' ? 'Save Demo Slot & Enter Portal →' : 'Save Demo Details & Enter Portal'}
          </button>
        </div>
      </form>
    </div>
  );
}
