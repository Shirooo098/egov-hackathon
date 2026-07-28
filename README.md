# eBuhay - DICT eGov Organ & Blood Matching Platform

> LifeSync: A prototype government platform for the Philippines that matches blood and organ donors with recipients, enables direct citizen communication, and automates tri-party (Doctor + Donor + Recipient) scheduling.

## 🚨 Demo Mode Notice

**This project is configured for demo mode by default.** All external API integrations (eVerify, eMessage, eGovAI, Besu Blockchain) are fully mocked and require no real credentials to run.

---

## Project Structure

```
egov-hackathon/
├── client/                    # React.js Frontend (Vite)
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   ├── pages/           # Page-level components
│   │   ├── services/        # API service layer
│   │   └── styles/          # CSS design tokens
│   ├── .env                 # Frontend environment (demo mode)
│   └── package.json
│
├── server/                   # Node.js/Express Backend
│   ├── src/
│   │   ├── controllers/     # Route handlers
│   │   ├── routes/          # API route definitions
│   │   ├── services/        # External API integrations
│   │   └── app.js           # Express app configuration
│   ├── .env                 # Backend environment (demo mode)
│   ├── tests/               # Test suite
│   └── package.json
│
├── supabase/
│   └── schema.sql           # Database schema
│
├── .gitignore               # Git ignore rules
├── spec.md                  # Technical specification
└── tasks/                   # Planning documents
```

---

## Quick Start (Demo Mode)

### Prerequisites
- Node.js 18+ 
- npm 9+

### 1. Start the Backend Server

```bash
cd server
npm install
npm start
# Server runs on http://localhost:5000
```

### 2. Start the Frontend

```bash
cd client
npm install
npm run dev
# Frontend runs on http://localhost:5173
```

### 3. Run Verification Tests

```bash
cd server
npm run test:demo
```

---

## Environment Configuration

### Demo Mode (Default)
The project comes pre-configured for demo mode with no external API calls:

**Server (.env):**
```bash
DEMO_MODE=true
EVERIFY_CLIENT_ID=dict_everify_demo_client_id
EMESSAGE_API_TOKEN=dict_emessage_demo_token
EGOVAI_ACCESS_CODE=dict_egovai_demo_access_code
```

**Client (.env):**
```bash
VITE_API_URL=http://localhost:5000/api
VITE_DEMO_MODE=true
```

### Production Mode
To enable real API integrations, set:

```bash
DEMO_MODE=false
EVERIFY_CLIENT_ID=your_real_client_id
EVERIFY_CLIENT_SECRET=your_real_client_secret
EMESSAGE_API_TOKEN=your_real_token
EGOVAI_ACCESS_CODE=your_real_access_code
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_key
```

---

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Health check |
| `/api/auth/verify` | POST | eVerify identity verification |
| `/api/auth/verify/qr` | POST | QR code verification |
| `/api/matches/find` | GET | Find compatible donors |
| `/api/matches/compatibility/:blood_type` | GET | Blood type compatibility |
| `/api/matches/matrix` | GET | Full compatibility matrix |
| `/api/schedule/ai-optimize` | POST | AI-generated appointment slots |
| `/api/blockchain/anchor` | POST | Anchor consent on Besu blockchain |
| `/api/blockchain/chain-info` | GET | Get chain information |
| `/api/egovai/laws` | POST | Laws & regulations Q&A |

---

## Demo Features

- ✅ **eVerify**: PhilSys identity verification (mocked)
- ✅ **eMessage**: SMS notifications (mocked)  
- ✅ **eGovAI**: Legal Q&A & scheduling (mocked)
- ✅ **Besu**: Blockchain anchoring (mocked)
- ✅ **Matchmaking**: ABO/Rh compatibility matrix
- ✅ **Scheduling**: AI tri-party slot optimization

---

## Security Notes

- `.env` files are excluded from version control
- No real API credentials are stored in the repository
- All external integrations are mocked in demo mode

---

## License

This is a DICT eGov prototype project for demonstration purposes only.