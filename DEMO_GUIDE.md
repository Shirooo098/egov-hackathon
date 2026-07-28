# eBuhay Platform — Demo Mode & End-to-End Workflow Guide

This document provides a comprehensive guide on how Demo Mode operates in the eBuhay platform, explains why testing the end-to-end workflow might appear static without specific navigation, and details our plan to streamline local demonstrations.

---

## 1. How to Enable Demo Mode Today

To enable **Demo Mode** for your backend services, ensure the following environment variable is set in your server configuration file located at `server/.env`:

```env
DEMO_MODE=true
```

### What `DEMO_MODE=true` Currently Mocks
When this flag is active, your Express server bypasses live DICT endpoints and returns simulated data with realistic latency for the following core integrations:
* **PhilSys eVerify:** Demographic matching and QR code verification (`server/src/services/eVerifyService.js`).
* **DICT eMessage:** Simulated mobile SMS push notifications (`server/src/services/eMessageService.js`).
* **eGovAI Suite:** Medical legal QA chatbot responses and predictive scheduling (`server/src/services/eGovAIService.js`).
* **Hyperledger Besu:** Zero-fee cryptographic consent anchoring on Testnet Chain `13371` (`server/src/services/BesuService.js`).

---

## 2. Why Testing the Clinical Workflow Appeared Static

When attempting to test the progression of **Auto-Match ➔ Hospital Approves ➔ Recipient Schedules ➔ Donor Confirmation ➔ Contract ➔ Chat**, you may have encountered barriers due to three architectural design constraints:

### A. eGov SSO & Face Liveness Bypass is Missing
Currently, the SSO and biometric verification endpoints in `server/src/routes/egov.js` **do not check the `DEMO_MODE=true` flag**. Regardless of your environment configuration, these routes unconditionally execute live network requests to `https://hackathon-sso.e.gov.ph`. Using test credentials throws an `invalid exchange code` error and blocks portal entry.

### B. Citizen Self-Approval Buttons Were Removed
Per **Issue #006**, all self-service `"Simulate Doctor Approval"` buttons were removed from the citizen portal (`/`) to enforce real-world medical governance. When a citizen signs in, their match initializes in `pending_hospital_approval` status with the message *"Awaiting Institutional Doctor Approval."* From the citizen perspective, the workflow appears frozen because only an authorized institutional officer can progress the lifecycle.

### C. Single-Page Memory Isolation Across Browser Tabs
Institutional approval occurs on the separate Hospital Dashboard route (`/hospital-dashboard`). Because `client/src/context/MatchContext.jsx` currently maintains state solely via standard React `useState` memory, **opening the Hospital Dashboard in a second browser tab does not communicate with the Citizen Portal in the first tab**. Clicking `"Approve Match"` in Tab 2 will not automatically advance the UI state in Tab 1.

---

## 3. How to Execute the Demo Workflow Today (Single Tab Sequence)

To navigate the entire workflow successfully in the current build, you must perform all actions sequentially within a **single browser tab**:

1. **Auto-Match Discovery:** Open `/` and authenticate into the **Recipient** portal (or enter via demo fallbacks). You will land on the **My Match (Live)** tab showing an ABO compatible match in `pending_hospital_approval` status.
2. **Institutional Triage Approval:** Click **"Exit Role"** in the top navigation bar (or navigate directly to `/hospital-dashboard` in the existing tab). On the Hospital command console, select the **Clinical Triage & Review** tab and click **"Approve Match"** on `demo-match-pgh-001`.
3. **Interactive Schedule Handshake:** Click **"← Back to Citizen Portal"**, select **Recipient**, and return to **My Match**. An automated DICT eMessage push SMS toast will display, and appointment schedule proposal inputs will be unlocked. Enter a date, time, and location, then submit your proposed schedule.
4. **Partner Confirmation:** Click **"Exit Role"** and transition to the **Donor** portal. Navigate to **My Match** to view the incoming appointment proposal. Click **"Confirm Schedule ✓"** (or propose an alternative date/time).
5. **Government Donation Agreement Execution:** Once scheduled, the **Donation Agreement** tab automatically unlocks across both portals. Open the tab, review the pre-filled clinical form, check the electronic signature box, and click **"Submit Agreement"**.
6. **Unmasked Peer Clinical Chat:** Repeat the signature submission for the reciprocal partner role. Upon dual-signing, the background worker silently anchors the consent SHA-256 hash to Hyperledger Besu, and the **Clinical Chat** tab unlocks for real-name peer coordination.

---

## 4. Recommended Demo Enhancement Plan

To ensure seamless end-to-end demonstrations and effortless local QA testing without needing to constantly click "Exit Role" or connect to live external servers, we recommend implementing a **Demo Presentation Suite**:

1. **Add Demo Bypass to `server/src/routes/egov.js`:** Configure the SSO token exchange and liveness session endpoints to honor `DEMO_MODE=true` (or recognize test exchange codes such as `demo`, `test`, or `hackathon`). This will instantly generate a mock PhilSys Tier I profile and simulate a passing Face Liveness scan (`99.4% confidence`) without live network calls.
2. **Add a ⚡ "Quick Demo Sign-In" Action:** Incorporate a one-click demo login button directly into `EgovSsoForm.jsx` to pre-fill test credentials and authenticate evaluators immediately.
3. **Enable Real-Time Multi-Tab Synchronization:** Upgrade `client/src/context/MatchContext.jsx` to synchronize state updates via `localStorage` and `BroadcastChannel`. This allows evaluators to position the Citizen Portal (`/`) and Hospital Dashboard (`/hospital-dashboard`) in separate browser windows side-by-side. Clicking `"Approve Match"` or `"Propose Schedule"` in one window will instantaneously advance the workflow state and trigger mobile eMessage toast animations across all open browser screens simultaneously.
