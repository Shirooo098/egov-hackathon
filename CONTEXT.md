# eBuhay Domain Context

The official DICT eGov platform linking verified citizens and institutional hospitals to coordinate life-saving blood and organ matching, secure direct communication, scheduling handshakes, and on-chain agreement auditing.

## Roles & Entities

**Hospital**:
An institutional healthcare facility (such as the Philippine General Hospital) that evaluates matched cases, grants formal medical approval, and reviews immutable cryptographic audit trails.
_Avoid_: Doctor, attending physician, medical administrator, clinic.

**Citizen**:
An individual using the platform as either a Donor or Recipient whose real identity and life status are authenticated via PhilSys eGov SSO.
_Avoid_: User, patient, customer, account.

**Donor**:
A verified citizen pledging organs or blood who reviews scheduled procedure dates and digitally signs donation agreements.
_Avoid_: Giver, provider, benefactor.

**Recipient**:
A verified citizen declaring a specific organ or blood requirement who proposes procedure schedules once their match receives institutional hospital approval.
_Avoid_: Requester, receiver, candidate, patient.

## Core Domain Concepts

**Match**:
An automated clinical pairing between a Donor and Recipient calculated by the platform against ABO/Rh compatibility rules, organ pledges, and urgency scoring.
_Avoid_: Case, pairing, request, hit.

**Schedule Proposal**:
A tentative clinical date and time suggested by a Recipient for the surgical procedure or blood verification, which the Donor may accept or counter-propose with an alternative date.
_Avoid_: AI tri-party scheduler, booking, meeting, consultation slot.

**Donation Agreement**:
An official government-styled clinical document pre-filled with matched donor, recipient, hospital, and anatomical details that both parties digitally sign prior to surgical readiness.
_Avoid_: Consent form, legal waiver, contract, pledge sheet.

**Blockchain Anchor**:
The zero-knowledge SHA-256 cryptographic hash of a finalized Donation Agreement permanently recorded on the DICT Besu blockchain and exposed exclusively to Hospital auditors.
_Avoid_: Web3 transaction, NFT, on-chain contract, block save.

## eGov Core Integrations

**eVerify**:
The national identity integration connecting to PhilSys for demographic token exchange, QR validation, and biometric Face Liveness authentication during citizen onboarding.
_Avoid_: eKYC, login check, identity scanner, bio-auth.

**eMessage**:
The official DICT SMS infrastructure that delivers high-priority clinical text notifications to citizens' mobile phones upon status progression or schedule proposals.
_Avoid_: Text alert, SMS text, push notification, ping.

**eGovAI**:
The intelligent public governance assistant providing real-time multimodular citizen Q&A regarding Republic Act No. 7170 (Organ Donation Law), Republic Act No. 7719 (National Blood Services Act), and regional health governance.
_Avoid_: Chatbot, LLM helper, rules bot.
