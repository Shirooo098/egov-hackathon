# Technical Implementation Plan: LifeSync - eGov Organ & Blood Matching Platform

## System Architecture Overview

LifeSync connects Citizens (Donors & Recipients) with Medical Professionals (Doctors) through DICT eGov infrastructure:
```text
           â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
           â”‚                   React Frontend UI                     â”‚
           â”‚  (Donor Portal | Recipient Portal | Doctor Console)     â”‚
           â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                                        â”‚ REST API
           â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â–¼â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
           â”‚                Node.js / Express Backend                â”‚
           â”‚  - Matchmaking Engine    - eGov AI & Scheduler Engine   â”‚
           â”‚  - eVerify Client        - eMessage Client              â”‚
           â”‚  - Besu Web3 Service     - Supabase Client Service      â”‚
           â””â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”˜
                  â”‚              â”‚              â”‚              â”‚
      â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â–¼â”€â”€â”    â”Œâ”€â”€â”€â”€â”€â”€â–¼â”€â”€â”€â”€â”€â”€â” â”Œâ”€â”€â”€â”€â”€â–¼â”€â”€â”€â”€â”€â”€â” â”Œâ”€â”€â”€â”€â”€â–¼â”€â”€â”€â”€â”€â”€â”
      â”‚  eVerify API â”‚    â”‚ eMessage SMSâ”‚ â”‚ eGovAI API â”‚ â”‚ Besu Web3  â”‚
      â”‚  (PhilSys ID)â”‚    â”‚  (Push API) â”‚ â”‚ (Q&A/Sched)â”‚ â”‚ (RPC 13371)â”‚
      â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜    â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜ â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜ â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

---

## Component Breakdown & Dependencies

### 1. Database & Infrastructure (`supabase/`)
- `schema.sql`: Table definitions for:
  - `users`: (id, role, name, email, phone, blood_type, organ_pledge, location, everify_status, everify_data)
  - `donor_profiles` / `recipient_requests`: (medical details, urgency, status)
  - `matches`: (id, donor_id, recipient_id, doctor_id, blood_match_score, organ_compatibility, status)
  - `schedules`: (id, match_id, doctor_id, donor_id, recipient_id, scheduled_time, status, notes)
  - `chat_messages`: (id, match_id, sender_id, receiver_id, message, timestamp)
  - `blockchain_anchors`: (id, match_id, consent_hash, tx_hash, block_number, timestamp)

### 2. Express Backend API (`server/`)
- **Services**:
  - `eVerifyService.js`: Token management, demographic query, QR check & face liveness sessions.
  - `eMessageService.js`: SMS push dispatch via `POST /messaging/v1/sms/push`.
  - `eGovAIService.js`: Q&A for PH health laws + AI scheduling constraint optimizer.
  - `BesuService.js`: Hyperledger Besu Web3 RPC client (`eth_sendRawTransaction` / `eth_call`) for hashing & anchoring e-signatures.
  - `MatchService.js`: ABO/Rh matrix & organ compatibility scoring.
- **Controllers & Routes**:
  - `/api/auth` & `/api/verify` (eVerify integration)
  - `/api/matches` (Matchmaking engine)
  - `/api/schedule` (AI Doctor-Donor-Recipient appointment solver)
  - `/api/chat` & `/api/message` (Direct messaging + SMS alerts)
  - `/api/egovai` (Q&A on laws & regulations)
  - `/api/blockchain` (Consent e-signature anchoring)

### 3. React Frontend (`client/`)
- **Components**:
  - `Navbar.jsx`: Brand header with role switcher (Donor / Recipient / Doctor / Admin) & eVerify badge.
  - `EVerifyModal.jsx`: Interactive eKYC / QR code scanner simulation modal.
  - `MatchCard.jsx`: Compatibility score display & match request action.
  - `ChatBox.jsx`: Real-time chat with eMessage SMS alert toggle.
  - `AIScheduler.jsx`: Multi-party doctor consultation booking interface.
  - `BlockchainBadge.jsx`: Real-time Besu transaction hash explorer link & tamper-proof certificate viewer.
  - `EGovAIWidget.jsx`: Interactive assistant for PH Health Laws & Organ Donation regulations.
- **Pages**:
  - `DonorDashboard.jsx`
  - `RecipientDashboard.jsx`
  - `DoctorConsole.jsx`
  - `VerificationPage.jsx`

---

## Implementation Order
1. **Database Schema & Server Foundation**: Set up Express server structure, environment configurations, and Supabase DDL.
2. **eGov API Services Integration**: Implement `eVerifyService`, `eMessageService`, `eGovAIService`, and `BesuService`.
3. **Core Matching Engine & AI Scheduler**: Build algorithm for blood/organ compatibility and tri-party schedule generation.
4. **React Design System & Frontend Shell**: Build Vite React app, design tokens, navbar, role switcher, and theme.
5. **Role Portals & Interactive Workflows**:
   - Donor Portal (Registration, eVerify, Pledging)
   - Recipient Portal (Posting request, Match search, Direct Chat)
   - Doctor Console (Diagnostic Scheduler, Match Approval, Blockchain Consent Anchoring)
   - eGovAI Laws & Q&A Portal
6. **End-to-End Testing & Verification**: Run backend service tests, match matrix verification, and visual DevTools browser tests.

---

## Verification Plan

### Automated & Logic Tests:
- `npm test` inside `server/` testing:
  - ABO/Rh Blood Matching algorithm.
  - eVerify API payload builder.
  - Besu Blockchain hashing function & RPC request format.

### Manual & Visual Verification:
- Complete end-to-end user journey test:
  1. Recipient creates organ/blood request.
  2. Donor matches with recipient.
  3. Donor and Recipient perform eVerify identification.
  4. Both initiate direct chat (verifying eMessage SMS trigger).
  5. AI Scheduler generates diagnostic consultation slot for Doctor + Donor + Recipient.
  6. Doctor approves match & diagnosis.
  7. Both parties sign digital consent, anchored on Besu Blockchain with valid transaction hash.
