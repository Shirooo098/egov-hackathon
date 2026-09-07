# eBuhay - DICT eGov Organ & Blood Matching Platform

> LifeSync: A prototype government platform for the Philippines that matches blood and organ donors with recipients, enables direct citizen communication, and automates tri-party (Doctor + Donor + Recipient) scheduling.

## 🚨 Demo Mode Notice

**This project is configured for demo mode by default for the eVerify, eMessage, and eGovAI integrations** — they are fully mocked and require no real credentials to run. The **Blockchain integration is real and on-chain by default** (Ethereum Sepolia testnet), so consent anchoring produces verifiable transaction hashes on Etherscan.

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
The project comes pre-configured for demo mode for eVerify, eMessage, and eGovAI. The **blockchain is real by default** — see the Blockchain Setup section below.

**Server (.env) — non-blockchain:**
```bash
EVERIFY_CLIENT_ID=dict_everify_demo_client_id
EMESSAGE_API_TOKEN=dict_emessage_demo_token
EGOVAI_ACCESS_CODE=dict_egovai_demo_access_code
```

**Client (.env):**
```bash
VITE_API_URL=http://localhost:5000/api
VITE_EXPLORER_URL=https://sepolia.etherscan.io
```

### 🔗 Blockchain Setup (Real On-Chain Anchoring)

The eBuhay platform anchors every dual-signed Donation Agreement to a real EVM testnet as a 0-value transaction whose calldata is the SHA-256 hash of the consent payload. The transaction is publicly verifiable on a block explorer.

**Default chain: Ethereum Sepolia** (Chain ID 11155111). Sepolia is the most reliable public testnet and the easiest for judges to verify.

**Generate a test wallet** (TESTNET ONLY — never reuse this key for mainnet):
```bash
cd server
node -e "const {Wallet}=require('ethers'); const w=Wallet.createRandom(); console.log('Address:', w.address); console.log('Private Key:', w.privateKey);"
```

**Fund the wallet** with test ETH from a Sepolia faucet:
- https://sepoliafaucet.com
- https://www.infura.io/faucet/sepolia
- https://cloud.google.com/application/web3/faucet/ethereum/sepolia

**Server (.env) — blockchain:**
```bash
BESU_MODE=sepolia
BESU_RPC_URL=https://ethereum-sepolia-rpc.publicnode.com
BESU_CHAIN_ID=11155111
BESU_PRIVATE_KEY=0x_your_testnet_private_key_here
ANCHOR_WALLET_ADDRESS=0x_your_wallet_address_here   # optional, defaults to the wallet's own address
EXPLORER_URL=https://sepolia.etherscan.io
```

**Optional: switch to DICT Besu** (if your hackathon requires the official DICT chain):
```bash
BESU_MODE=besu
BESU_RPC_URL=https://hackathon-blockchain.e.gov.ph
BESU_CHAIN_ID=13371
EXPLORER_URL=https://hackathon-explorer.e.gov.ph
```

> ⚠️ **Security:** `BESU_PRIVATE_KEY` must point to a key that has never touched mainnet. The key in the deployed environment should be treated as semi-public (it's a server-side env var, but anyone with it can drain any ETH on that account — so fund it only with testnet ETH and rotate if exposed).

**Verify it works:** sign a consent in the deployed app, copy the `txHash` shown in the BlockchainBadge, paste into `https://sepolia.etherscan.io/tx/<hash>`. The transaction should appear with the consent hash in the "Input Data" field.

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

- ✅ **eVerify**: PhilSys identity verification (mocked, config-switchable to live)
- ✅ **eMessage**: SMS notifications (mocked, config-switchable to live)
- ✅ **eGovAI**: Legal Q&A & scheduling (mocked, config-switchable to live)
- ✅ **Besu / EVM**: Real on-chain consent anchoring (Ethereum Sepolia by default, DICT Besu available)
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