# eBuhay Codebase Analysis

> Deep research conducted: 2026-07-29  
> Source: Full file-by-file analysis of client + server + schema

---

## 1. Current Architecture

### Tech Stack
- **Frontend**: React.js (Vite), JavaScript, Vanilla CSS with glassmorphism theme
- **Backend**: Node.js & Express.js REST API
- **Database**: Supabase (PostgreSQL) — schema defined but using mostly dummy data
- **Integrations**: eVerify, eMessage, eGovAI, Hyperledger Besu Blockchain (all simulated/demo mode)

### Project Structure
```
client/
├── src/
│   ├── App.jsx              (38KB — monolithic state machine, no router)
│   ├── main.jsx
│   ├── components/
│   │   ├── BlockchainBadge.jsx      (dual e-signature + blockchain anchoring)
│   │   ├── CalendarScheduleView.jsx (3-month interactive calendar)
│   │   ├── ChatBox.jsx              (gated chat with identity masking)
│   │   ├── EGovAIWidget.jsx         (Laws Q&A AI widget)
│   │   ├── MatchReviewModal.jsx     (compatibility detail modal)
│   │   ├── Navbar.jsx + Navbar.css  (top nav with portal switching)
│   │   ├── OrganAnalytics.jsx       (analytics dashboard)
│   │   ├── SignatureUploader.jsx    (file upload for signatures)
│   │   └── Toast.jsx                (notification toasts)
│   ├── context/
│   │   ├── ThemeContext.jsx         (dark/light mode toggle)
│   │   └── ToastContext.jsx         (toast notification system)
│   ├── pages/
│   │   ├── DonorDashboard.jsx       (25KB — donor workflow)
│   │   ├── RecipientDashboard.jsx   (28KB — recipient workflow)
│   │   └── DoctorConsole.jsx        (14KB — doctor review console)
│   ├── services/
│   │   ├── api.js                   (fetch wrapper for backend endpoints)
│   │   └── egovApi.js               (eGov SSO + liveness API client)
│   └── styles/
│       └── global.css               (57KB — full design system)

server/
├── src/
│   ├── app.js                       (Express entrypoint)
│   ├── controllers/
│   ├── routes/
│   │   ├── verify.js, match.js, schedule.js
│   │   ├── blockchain.js, egovai.js, egov.js
│   └── services/
│       ├── MatchService.js          (ABO/Rh compatibility algorithm)
│       ├── BesuService.js           (blockchain simulation)
│       ├── eVerifyService.js, eMessageService.js, eGovAIService.js

supabase/
└── schema.sql                       (7 tables + seed data)
```

---

## 2. Current Navigation / Routing

**No React Router.** The entire app is a single-page state machine in `App.jsx`:

```
role === null     → Onboarding Wizard (ROLE_SELECT → AUTH_CHOICE → SSO_PENDING → LIVENESS → RECIPIENT_HEALTH/DONOR_PLEDGE)
role === 'recipient' → <RecipientDashboard />
role === 'donor'     → <DonorDashboard />
```

Portal switching via Navbar toggles the `role` state variable.

---

## 3. Current Match Status Flow

### Database Schema Statuses (`schema.sql`):
- **Recipient Requests**: `open`, `matched`, `scheduled`, `completed`, `cancelled`
- **Match Records**: `pending`, `accepted`, `scheduled`, `doctor_approved`, `operation_ready`, `completed`, `rejected`
- **Donor Availability**: `available`, `unavailable`, `matched`, `donated`
- **Blockchain Anchors**: `pending`, `confirmed`, `failed`
- **Schedules**: `proposed`, `confirmed`, `cancelled`, `completed`

### UI Flow (Recipient):
`declare` → `find` → `matched` (Pending Doctor Approval) → `approved` (Doctor Approved) → `scheduled`

### UI Flow (Donor):
`list` → `matched` (pending doctor review) → `approved` (Doctor approved) → `scheduled`

---

## 4. Current Matching Algorithm (`MatchService.js`)

**Rule-based compatibility scoring:**
- **Blood Match**: Exact type = 100%; compatible O- donor = 85%; other compatible = 90%; incompatible = 0%
- **Organ Match**: `bloodScore * 0.8 + 20` (requires donor to have pledged the specific organ)
- **Urgency Weighting**: critical (1.5x), urgent (1.2x), moderate (1.0x), capped at 100%
- **Execution**: Triggered on demand via `api.findMatches()` — NOT automatic

### Demo Donors (fallback data in MatchService):
Hardcoded `DEMO_DONORS` array used when DB is unavailable.

---

## 5. Current Doctor Console (`DoctorConsole.jsx`)

### Tabs:
1. **Cases** — Review pending/approved matches with hardcoded cases:
   - `Juan Dela Cruz → Ana Reyes` (Kidney, Critical, 94%)
   - `Rosa Magtanggol → Carlos Santos` (Blood B+, Urgent, 88%)
   - `Pedro Reyes → Luz Garcia` (Cornea, Moderate, 91%)
2. **Schedule** — AI Tri-Party Scheduler with calendar
3. **Laws** — eGovAI Laws Q&A widget
4. **Analytics** — Organ donation analytics

### Key State:
- `selCase`: Selected match case
- `approved`: `Set` of approved case IDs
- `slots`: AI-generated schedule slots

---

## 6. Current Chat System (`ChatBox.jsx`)

### Gating:
- **Lock screen** when `doctorApproved === false` → "Messaging Prohibited (Doctor Approval Required)"
- **Identity masking** when `consentSigned === false` → Anonymous names (e.g., `Anonymous Recipient #9C41`)
- **Real names** after consent signed

### Implementation:
- Local component state only (no WebSocket/real-time)
- Pre-populated `DEMO` messages array
- Role-based message bubble styling (left/right alignment)

---

## 7. Current Blockchain Simulation (`BesuService.js` + `BlockchainBadge.jsx`)

### Flow:
1. Both parties upload signatures via `SignatureUploader`
2. `BlockchainBadge` checks `donorSigned && recipientSigned`
3. Anchoring triggered → SHA-256 hash of consent payload
4. **Demo mode**: Simulates 300-800ms latency, generates fake tx hash (`0x7c2a...`), increments block counter from `#4821`
5. Returns explorer link to `hackathon-blockchain.e.gov.ph`

### Payload hashed:
`matchId`, `donorId`, `recipientId`, `donorSignature`, `recipientSignature`, `timestamp`

---

## 8. Current Scheduling (`CalendarScheduleView.jsx`)

### Features:
- 3-month interactive calendar grid
- Date selection highlights with emerald indicators
- Slot cards with hospital assignments (PGH, St. Luke's BGC, NKTI, Heart Center, Red Cross)
- "Confirm & Book" action transitions to `scheduled` step

### AI Scheduler Backend:
- `POST /api/schedule/ai-optimize` — takes availability windows + urgency → returns optimal slots

---

## 9. Database Schema (7 Tables)

| Table | Key Columns |
|---|---|
| `users` | `id`, `role`, `first_name`, `last_name`, `email`, `phone`, `blood_type`, `everify_status`, `philsys_pcn` |
| `donor_profiles` | `user_id`, `organ_pledges[]`, `availability_status`, `is_blood_donor` |
| `recipient_requests` | `user_id`, `request_type`, `blood_type_needed`, `organ_needed`, `urgency_level`, `status` |
| `matches` | `donor_id`, `recipient_id`, `doctor_id`, `request_id`, `compatibility_score`, `match_type`, `status` |
| `schedules` | `match_id`, `doctor_id`, `donor_id`, `recipient_id`, `scheduled_time`, `location`, `status` |
| `chat_messages` | `match_id`, `sender_id`, `receiver_id`, `message_text`, `is_read`, `sms_sent` |
| `blockchain_anchors` | `match_id`, `consent_hash`, `tx_hash`, `block_number`, `chain_id`, `status` |

### Seed Data:
- 1 Doctor: `Dr. Maria Santos`
- 1 Donor: `Juan Dela Cruz` (O+, kidney pledge)
- 1 Recipient: `Ana Reyes` (kidney need, critical urgency)

---

## 10. Design System (`global.css` — 57KB)

### Color Palette:
- **eGov Deep Blue**: `#0038A8` / `#0F2C59`
- **eBuhay Cyan**: `#0284C7` / `#0EA5E9`
- **Philippine Sun Gold**: `#F59E0B` / `#FCD34D`
- **Flag Red**: `#CE1126`
- **Health Emerald**: `#059669`
- **Backgrounds**: Light `#F8FAFC`, Slate `#F1F5F9`, Dark `#0F172A`

### Theme:
- Glassmorphism effects (`backdrop-filter: blur`)
- Dark/light mode toggle via `ThemeContext`
- CSS custom properties for all tokens
- Responsive breakpoints

---

## 11. Onboarding Flow (`App.jsx`)

### Steps:
1. **ROLE_SELECT** — Choose Donor or Recipient
2. **AUTH_CHOICE** — Sign In (existing eGov) or Sign Up (new)
3. **SSO_PENDING** — eGov SSO exchange code entry
4. **LIVENESS** — Face liveness camera verification (4 stages)
5. **RECIPIENT_HEALTH** / **DONOR_PLEDGE** — Health profile or organ pledge form

### Key Data:
- `userProfile`: PhilSys fields (`first_name`, `last_name`, `birth_date`, `email`, `mobile`, `pcn`)
- `recipientHealth`: `{ blood_type, organ_needed, urgency, medical_conditions, hospital_preference }`
- `donorPledge`: `{ blood_type, is_blood_donor, organ_pledges[], availability }`

---

## 12. Key API Endpoints

| Endpoint | Purpose |
|---|---|
| `GET /health` | Server health check |
| `POST /api/auth/verify` | eVerify identity verification |
| `POST /api/matches/find` | Find compatible donors |
| `GET /api/matches/compatibility/:type` | Compatibility matrix |
| `POST /api/schedule/ai-optimize` | AI tri-party scheduler |
| `POST /api/blockchain/anchor` | Anchor consent to blockchain |
| `GET /api/blockchain/receipt/:hash` | Get blockchain receipt |
| `POST /api/egovai/laws` | Laws & regulations Q&A |
| `POST /api/egov/exchange-token` | SSO token exchange |
| `POST /api/egov/liveness/create` | Create liveness session |
