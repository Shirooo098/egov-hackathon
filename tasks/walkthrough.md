# eBuhay Platform — Verification Walkthrough

This document guides you through verifying the complete, end-to-end functionality of the **eBuhay** platform, showcasing the DICT eGov API integrations and clean user flows.

---

## 🚀 Setup & Startup Check

1. **Verify Backend Status**:
   - Ensure the Express API is running on port 5000:
     ```bash
     cd server && npm run dev
     ```
   - Health check endpoint: `http://localhost:5000/api/health`

2. **Verify Frontend Status**:
   - Ensure the Vite dev server is running on port 5173:
     ```bash
     cd client && npm run dev
     ```
   - Open **[http://localhost:5173](http://localhost:5173)** in your browser.

---

## 🔄 Step-by-Step User Journey

### Phase 1: Identity Verification (eVerify)
1. In the top navbar, click the **Verify ID** button.
2. The mock **PhilSys eVerify check** runs face liveness verification.
3. Upon completion, the badge shifts to a green **PhilSys ✓ Tier I** indicator.

### Phase 2: Donor Search (ABO/Rh Matching Matrix)
1. Set the role to **Recipient** in the navbar switcher.
2. Select **Blood Donation**, set Blood Type to **A+**, and Urgency to **Urgent**.
3. Click **Find Compatible Donors**.
4. You will see compatible donors listed, with compatibility percentage bars (calculated by our custom matching matrix) and their PhilSys eVerify statuses.

### Phase 3: Direct Messaging & Notification (eMessage)
1. Click the **Contact →** button on a compatible donor match (e.g. *Juan Dela Cruz*).
2. The tab shifts to the **Chat** interface.
3. Send a message by typing and hitting **Enter**.
4. The backend generates eMessage push logs representing SMS dispatch to the donor's mobile number.

### Phase 4: Tri-Party Scheduling (eGovAI Scheduler)
1. Click the **Schedule** tab.
2. Click **Generate AI Schedule**.
3. The platform sends a constraint query to the backend schedule optimizer.
4. Three optimal, conflict-free time slots for Doctor, Donor, and Recipient are returned. Click **Book** to reserve.

### Phase 5: On-Chain Consent Anchoring (Besu Blockchain)
1. Click the **Consent** tab.
2. Click **Sign Now** for both the **Donor** and the **Recipient** signatures to confirm legal agreement.
3. Click **Anchor Consent to Blockchain**.
4. The system sends the transaction payload to the simulated Hyperledger Besu network, returning:
   - **Transaction Hash**: Encrypted ledger transaction ID.
   - **Block Number**: Block index of the transaction.
   - **Explorer URL**: Clickable link to view details.

### Phase 6: Laws Q&A (eGovAI Laws assistant)
1. Switch your role to **Doctor** in the navbar.
2. Click the **Laws AI** tab.
3. Click any quick question (e.g., *What is Republic Act 7170?*) or type a custom question.
4. eGovAI queries Philippine legal databases to return the health policies and regulations.
