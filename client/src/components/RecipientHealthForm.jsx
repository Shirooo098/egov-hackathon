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
      <h3 style={{ fontSize: 18, fontWeight: 800, marginBottom: 18, textAlign: 'center' }}>Recipient Health Declaration</h3>
      <form onSubmit={onSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div className="grid-2">
          <div className="field">
            <label className="label">Need Category</label>
            <select
              className="input"
              value={recipientHealth.request_type}
              onChange={e => setRecipientHealth({ ...recipientHealth, request_type: e.target.value })}
            >
              <option value="organ">Organ Transplant</option>
              <option value="blood">Blood Transfusion</option>
            </select>
          </div>

          {recipientHealth.request_type === 'organ' ? (
            <div className="field">
              <label className="label">Organ Needed</label>
              <select
                className="input"
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
              <label className="label">Blood Type Needed</label>
              <select
                className="input"
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
            <label className="label">Urgency Priority</label>
            <select
              className="input"
              value={recipientHealth.urgency_level}
              onChange={e => setRecipientHealth({ ...recipientHealth, urgency_level: e.target.value })}
            >
              <option value="moderate">Moderate (Standard)</option>
              <option value="urgent">Urgent Need</option>
              <option value="critical">Critical (ICU / Active Support)</option>
            </select>
          </div>
          <div className="field">
            <label className="label">Currently on Dialysis/Support?</label>
            <select
              className="input"
              value={recipientHealth.dialysis}
              onChange={e => setRecipientHealth({ ...recipientHealth, dialysis: e.target.value })}
            >
              <option value="no">No</option>
              <option value="yes">Yes</option>
            </select>
          </div>
        </div>

        <div className="field">
          <label className="label">Pre-existing Medical Conditions / Clinical Notes</label>
          <textarea
            className="input"
            rows={3}
            placeholder="Detail chronic illnesses, previous transplant surgeries, or clinical allergies..."
            value={recipientHealth.conditions}
            onChange={e => setRecipientHealth({ ...recipientHealth, conditions: e.target.value })}
          />
        </div>

        <div className="field" style={{ border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: 16, background: 'white' }}>
          <label className="label" style={{ marginBottom: 4 }}>1. Past Medical Record / Lab Documentation</label>
          <p style={{ fontSize: 12, color: 'var(--foreground-muted)', marginBottom: 12 }}>
            Upload lab results or medical records, or choose to schedule a diagnostic consultation instead.
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
                <span>⚠️ Schedule Diagnostic Consultation Slot</span>
              </div>
              <div className="grid-2">
                <div className="field">
                  <label className="label" style={{ fontSize: 11 }}>Attending Specialty</label>
                  <select
                    className="input"
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
                  <label className="label" style={{ fontSize: 11 }}>Consultation Date</label>
                  <input
                    className="input"
                    type="date"
                    style={{ height: 34, fontSize: 12 }}
                    value={recipientHealth.appointmentDate}
                    onChange={e => setRecipientHealth({ ...recipientHealth, appointmentDate: e.target.value })}
                  />
                </div>
              </div>
              <div className="field">
                <label className="label" style={{ fontSize: 11 }}>Preferred Time Slot</label>
                <select
                  className="input"
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
                <span>📅 Reserved Slot:</span>
                <strong style={{ color: 'var(--primary)' }}>{recipientHealth.appointmentDate} @ {recipientHealth.appointmentTime} ({recipientHealth.hospitalSpecialty || recipientHealth.doctorSpecialty})</strong>
              </div>
            </div>
          )}
        </div>

        <div className="field" style={{ border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: 16, background: 'white' }}>
          <label className="label" style={{ marginBottom: 4 }}>2. Mandatory Recipient Digital Signature Document (PDF or Image)</label>
          <p style={{ fontSize: 12, color: 'var(--foreground-muted)', marginBottom: 12 }}>
            Please upload your digital signature document to authorize your medical declaration and transplant request.
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
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
          <button className="btn btn-ghost" type="button" onClick={onBack} style={{ flex: 1 }}>Back</button>
          <button className="btn btn-primary" type="submit" style={{ flex: 2 }} disabled={!recipientHealth.signatureFile}>
            {recipientHealth.hasMedicalRecord === 'no' ? 'Book Slot & Enter Portal →' : 'Register & Enter Portal'}
          </button>
        </div>
      </form>
    </div>
  );
}
