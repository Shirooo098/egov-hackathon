import './DonorPledgeForm.css';
import React from 'react';
import SignatureUploader from '../match/SignatureUploader';

export default function DonorPledgeForm({
  donorPledge,
  setDonorPledge,
  onSubmit,
  onBack,
  anchoringPledge,
  pledgeAnchor,
  pledgeError,
}) {
  return (
    <div className="anim-in">
      <h3 className="migrated-1f2c3427">Donor Pledge (Demo)</h3>
      <p className="migrated-78d8b799">Review a sample pledge for this prototype journey. It is not a legal registration and is not stored in a national registry.</p>

      <form onSubmit={onSubmit} className="migrated-039dd51e">
        <div className="migrated-fd720fd5">
          <div className="migrated-20dcf194">
            <span className="migrated-e72f3736">My Pledged Organs</span>
            <div className="migrated-702ab413">
              <span className="migrated-e5022c59">Blood Type:</span>
              <select
                className="input migrated-763aa118"

                value={donorPledge.bloodType}
                onChange={e => setDonorPledge({ ...donorPledge, bloodType: e.target.value })}
              >
                {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div className="migrated-5f18923c">
            {['kidney', 'liver', 'cornea', 'heart', 'lung', 'pancreas'].map((org) => {
              const active = donorPledge.organs.includes(org);
              return (
                <button
                  key={org}
                  type="button"
                  onClick={() => {
                    const newOrgans = active ? donorPledge.organs.filter(x => x !== org) : [...donorPledge.organs, org];
                    setDonorPledge({ ...donorPledge, organs: newOrgans });
                  }}
                  className={`btn btn-sm migrated-5d4df660 ${active ? 'btn-primary' : 'btn-outline'}`}

                >
                  {org}
                </button>
              );
            })}
          </div>
        </div>

        <div className="field migrated-cc187a47" >
          <input
            type="checkbox"
            id="ageConsent"
            required
            checked={donorPledge.ageConsent}
            onChange={e => setDonorPledge({ ...donorPledge, ageConsent: e.target.checked })}
            className="migrated-d2a1a31b"
          />
          <label htmlFor="ageConsent" className="migrated-cd1c6985">
            For this demo, I confirm that I am 18 or older and understand the sample pledge shown above.
          </label>
        </div>

        <div className="field">
          <div className="label">Digital Signature Document (PDF or Image scan)</div>
          <SignatureUploader
            onUploadComplete={(file) => setDonorPledge({ ...donorPledge, signatureName: file.name })}
            onClear={() => setDonorPledge({ ...donorPledge, signatureName: '' })}
          />
        </div>

        {anchoringPledge && (
          <div className="card anim-in migrated-32e14a60" >
            <div className="spinner migrated-791c71cb"  />
            <span className="migrated-a54e6f50">Preparing the sample pledge record...</span>
          </div>
        )}

        {pledgeAnchor && !anchoringPledge && (
          <div className="card anim-in migrated-bb1140cf" >
            <div className="migrated-5d0e1ffa">
              <span>✓ Demo pledge recorded</span>
            </div>
            <div className="migrated-83c40d56">
              Demo record reference: {pledgeAnchor.txHash.substring(0, 16)}... | Sample record #{pledgeAnchor.blockNumber}
            </div>
          </div>
        )}

        {pledgeError && !anchoringPledge && (
          <p role="alert" className="migrated-729dd964">
            {pledgeError} The demo record was not saved. Check your connection and select “Submit Demo Pledge” to retry.
          </p>
        )}

        <div className="migrated-888b2c34">
          <button className="btn btn-ghost migrated-7e90f870" type="button" onClick={onBack}  disabled={anchoringPledge}>Back</button>
          <button className="btn btn-primary migrated-b3730661" type="submit"  disabled={anchoringPledge || !donorPledge.ageConsent || !donorPledge.signatureName.trim()}>
            Submit Demo Pledge
          </button>
        </div>
      </form>
    </div>
  );
}
