# Spec: eBuhay - Official DICT eGov Organ & Blood Match, Communication & Tri-Party Scheduling Platform

## 1. Objective
**eBuhay** is the official DICT e-Government medical platform integrated with eGov core services (eVerify, eMessage, eGovAI, Hyperledger Besu Blockchain). It connects blood and organ donors with recipients, facilitates direct citizen communication, matches compatible donors/recipients, automates tri-party doctor scheduling, and anchors e-signature consent agreements immutably on-chain.

### Target Users & Workflows:
- **Recipients**:
  - Verify identity via PhilSys **eVerify** (demographics + face liveness / QR).
  - Create blood/organ requests.
  - Communicate directly with matched donors via built-in messaging with **eMessage** SMS alerts.
  - Digitally sign e-signature consent agreements anchored on **Besu Blockchain**.
- **Donors**:
  - Verify identity via PhilSys **eVerify**.
  - Register blood type, organ pledge, location, and availability.
  - Communicate directly with recipients.
  - Digitally sign e-signature consent agreements on **Besu Blockchain**.
- **Doctors / Medical Administrators**:
  - Verify credentialed identity via PhilSys **eVerify**.
  - Review donor-recipient matches.
  - Conduct diagnostic consultations scheduled via **eGovAI / AI Scheduler**.
  - Approve or decline match cases for final surgery/donation procedure.

---

## 2. eGov Platform Integrations & Tech Stack

### Official DICT eGov Design & Color Palette (Referenced from platforms.e.gov.ph):
- **eGov Deep Blue (Primary)**: `#0038A8` / `#0F2C59` (Official Philippine Blue & DICT Governance)
- **eGov Sub-brand Cyan (eBuhay Primary)**: `#0284C7` / `#0EA5E9` (Clean Medical Trust)
- **Philippine Sun Gold (Accent)**: `#F59E0B` / `#FCD34D` (Badges & Highlight Alerts)
- **National Flag Red (Urgent / Critical)**: `#CE1126` (Emergency Organ & Blood Needs)
- **Health Success Emerald**: `#059669` (Verified Donors & Approved Matches)
- **Backgrounds**: Light (`#F8FAFC`), Slate (`#F1F5F9`), Dark Mode (`#0F172A`)

### Framework & Tech Stack:
- **Frontend**: React.js (Vite), JavaScript, DICT eGov Glassmorphism Vanilla CSS (responsive, accessible, dark/light toggle).
- **Backend API**: Node.js & Express.js REST API.
- **Database**: Supabase (PostgreSQL, Realtime tables, RLS policies).

### DICT eGov API Surface Integration:
1. **eVerify (PhilSys National ID Verification)**:
   - Token exchange: `POST /api/auth` (client_id + client_secret).
   - Face liveness + demographic verification: `POST /api/query`.
   - QR decoding: `POST /api/query/qr/check` and `POST /api/query/qr`.
   - Used for mandatory identity verification across Donors, Recipients, and Doctors.
2. **eMessage (SMS Push API)**:
   - Endpoint: `POST /messaging/v1/sms/push` with `X-EMESSAGE-Auth` header.
   - Triggers: New match found, chat messages received between Donor/Recipient, Doctor appointment scheduled/confirmed.
3. **eGovAI Suite**:
   - **Laws & Regulations Q&A**: `POST /api/v1/egov/integration/laws_and_regulations/generate` — Citizen Q&A for Philippine health & organ donation laws (English, Filipino, regional languages).
   - **AI Matchmaker & Tri-Party Scheduler**: Express engine + `eGovAI` prompt assist to analyze donor-recipient compatibility and compute conflict-free appointment slots (Doctor + Donor + Recipient).
4. **Besu Hyperledger Blockchain**:
   - RPC: `https://hackathon-blockchain.e.gov.ph` (Chain ID `13371`, zero-fee `gasPrice: 0`).
   - Function: Immutable anchoring of donor and recipient **e-signature consent agreements** via transaction hashes & smart contract receipts prior to procedure execution.

---

## 3. Commands
- **Install Dependencies**:
  - Backend: `cd server && npm install`
  - Frontend: `cd client && npm install`
- **Development**:
  - Backend: `cd server && npm run dev` (Port 5000)
  - Frontend: `cd client && npm run dev` (Port 5173)
- **Production Build & Verification**:
  - Backend: `cd server && npm start`
  - Frontend: `cd client && npm run build`
  - Lint & Test: `npm test`

---

## 4. Project Structure
```text
d:/egovhackathon/
â”œ-- spec.md                     # Living specification document
â”œ-- tasks/
â”‚   â”œ-- plan.md                 # Technical implementation plan
â”‚   â””-- todo.md                 # Granular task checklist
â”œ-- client/                     # React Frontend Application
â”‚   â”œ-- public/
â”‚   â”œ-- src/
â”‚   â”‚   â”œ-- components/         # eVerify Modal, Chat Box, Blockchain Verification Badge, Navbar
â”‚   â”‚   â”œ-- pages/              # Donor Dashboard, Recipient Portal, Doctor Console, eGov AI Laws Q&A
â”‚   â”‚   â”œ-- services/           # eVerify, eMessage, eGovAI, Besu RPC & Supabase clients
â”‚   â”‚   â”œ-- styles/             # Design tokens & DICT eGov theme CSS
â”‚   â”‚   â”œ-- App.jsx             # React router & User Role Context
â”‚   â”‚   â””-- main.jsx
â”‚   â”œ-- index.html
â”‚   â””-- package.json
â”œ-- server/                     # Express API Server
â”‚   â”œ-- src/
â”‚   â”‚   â”œ-- routes/             # auth, verify, match, schedule, chat, blockchain, egovai routes
â”‚   â”‚   â”œ-- controllers/        # Controllers handling eGov API integrations & database
â”‚   â”‚   â”œ-- services/           # eVerifyService, eMessageService, eGovAIService, BesuService, MatchService
â”‚   â”‚   â”œ-- middleware/         # Auth & error handling middleware
â”‚   â”‚   â””-- app.js              # Express app entrypoint
â”‚   â”œ-- package.json
â”‚   â””-- .env.example
â””-- supabase/
    â””-- schema.sql              # PostgreSQL DDL tables for Users, Matches, Chat, Schedules, BlockchainLogs
```

---

## 5. Code Style & Standards
- Clean ES6+ modular JavaScript (`async/await`, destructuring, clean REST controllers).
- Standardized API Response Wrapper:
  ```json
  {
    "success": true,
    "data": { ... },
    "error": null,
    "timestamp": "2026-07-21T23:45:00Z"
  }
  ```
- Component-driven React architecture with centralized CSS variable tokens matching official DICT eGov guidelines.

---

## 6. Testing & Verification Strategy
- **Compatibility Engine Tests**: Unit tests for ABO/Rh blood matching matrix & organ compatibility algorithms.
- **eGov API Services Tests**: Integration test suites verifying eVerify token lifecycle, eMessage payload formatting, eGovAI requests, and Besu Web3 RPC calls.
- **UI & UX Verification**: End-to-end browser checking of Donor, Recipient, and Doctor user journeys.

---

## 7. Boundaries & Governance
- **Always do**:
  - Enforce eVerify PhilSys verification state before allowing e-signature consent.
  - Anchor digital consent agreements (donor & recipient e-signatures) on Besu Blockchain with transaction hash returned.
  - Require Doctor approval after diagnostic consultation before marking match as "Ready for Operation".
- **Ask first**:
  - Database schema DDL modifications after initial setup.
  - Introducing non-DICT external APIs.
- **Never do**:
  - Expose eVerify `client_secret` or eGovAI `access_code` on the client-side.
  - Hardcode sensitive credentials in source code.

---

## 8. Reframed Quantifiable Success Criteria
1. **eVerify Integration**:
   - Successfully processes identity verification flow and binds PhilSys demographic profile to user account.
2. **Matchmaking Engine**:
   - Computes compatible donor-recipient pairs based on blood group ABO/Rh rules, organ type, and location in < 300ms.
3. **AI Tri-Party Scheduler**:
   - Generates conflict-free 3-party (Doctor + Donor + Recipient) diagnostic consultation slots within < 2 seconds.
4. **Direct Citizen Messaging & eMessage**:
   - Allows direct chat between matched Donor & Recipient, triggering instant eMessage SMS notifications upon critical updates/messages.
5. **Blockchain Consent Anchoring**:
   - Submits e-signature hash of dual consent agreement to Hyperledger Besu (Chain ID 13371), storing transaction hash and block number in Supabase for public audit verification.
6. **Doctor Diagnosis & Approval Console**:
   - Doctors can view diagnostic appointments, review match compatibility, and grant final operation authorization.

---
