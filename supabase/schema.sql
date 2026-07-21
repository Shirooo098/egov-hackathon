-- eHealth DICT eGov Platform - PostgreSQL Schema
-- Supabase compatible DDL

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- USERS TABLE (Donors, Recipients, Doctors)
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  role TEXT NOT NULL CHECK (role IN ('donor', 'recipient', 'doctor')),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT UNIQUE,
  phone TEXT,
  blood_type TEXT CHECK (blood_type IN ('A+','A-','B+','B-','AB+','AB-','O+','O-')),
  location_city TEXT,
  location_province TEXT,
  -- eVerify PhilSys fields
  everify_status TEXT DEFAULT 'unverified' CHECK (everify_status IN ('unverified','pending','verified','failed')),
  everify_tier TEXT CHECK (everify_tier IN ('Tier I', 'Tier II')),
  philsys_pcn TEXT,
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- DONOR PROFILES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS donor_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  organ_pledges TEXT[] DEFAULT '{}', -- e.g. ['kidney', 'liver', 'cornea']
  availability_status TEXT DEFAULT 'available' CHECK (availability_status IN ('available','unavailable','matched','donated')),
  medical_notes TEXT,
  is_blood_donor BOOLEAN DEFAULT FALSE,
  age INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- RECIPIENT REQUESTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS recipient_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  request_type TEXT NOT NULL CHECK (request_type IN ('blood', 'organ')),
  blood_type_needed TEXT CHECK (blood_type_needed IN ('A+','A-','B+','B-','AB+','AB-','O+','O-')),
  organ_needed TEXT, -- e.g. 'kidney', 'liver'
  urgency_level TEXT DEFAULT 'moderate' CHECK (urgency_level IN ('critical','urgent','moderate')),
  description TEXT,
  status TEXT DEFAULT 'open' CHECK (status IN ('open','matched','scheduled','completed','cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- MATCHES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS matches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  donor_id UUID REFERENCES users(id),
  recipient_id UUID REFERENCES users(id),
  doctor_id UUID REFERENCES users(id),
  request_id UUID REFERENCES recipient_requests(id),
  match_type TEXT NOT NULL CHECK (match_type IN ('blood', 'organ')),
  compatibility_score INTEGER CHECK (compatibility_score BETWEEN 0 AND 100),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending','accepted','scheduled','doctor_approved','operation_ready','completed','rejected')),
  match_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- SCHEDULES TABLE (AI Tri-Party Doctor + Donor + Recipient)
-- ============================================================
CREATE TABLE IF NOT EXISTS schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
  doctor_id UUID REFERENCES users(id),
  donor_id UUID REFERENCES users(id),
  recipient_id UUID REFERENCES users(id),
  scheduled_time TIMESTAMPTZ NOT NULL,
  schedule_type TEXT DEFAULT 'consultation' CHECK (schedule_type IN ('consultation','diagnostic','operation')),
  location TEXT,
  status TEXT DEFAULT 'proposed' CHECK (status IN ('proposed','confirmed','cancelled','completed')),
  ai_generated BOOLEAN DEFAULT FALSE,
  doctor_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- CHAT MESSAGES TABLE (Direct Donor-Recipient Messaging)
-- ============================================================
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES users(id),
  receiver_id UUID REFERENCES users(id),
  message TEXT NOT NULL,
  read_at TIMESTAMPTZ,
  sms_sent BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- BLOCKCHAIN ANCHORS TABLE (Besu e-Signature Consent)
-- ============================================================
CREATE TABLE IF NOT EXISTS blockchain_anchors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  match_id UUID REFERENCES matches(id),
  donor_id UUID REFERENCES users(id),
  recipient_id UUID REFERENCES users(id),
  consent_hash TEXT NOT NULL, -- SHA-256 of consent document
  tx_hash TEXT, -- Besu transaction hash
  block_number BIGINT,
  chain_id INTEGER DEFAULT 13371,
  anchor_status TEXT DEFAULT 'pending' CHECK (anchor_status IN ('pending','confirmed','failed')),
  donor_signed_at TIMESTAMPTZ,
  recipient_signed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- DEMO SEED DATA
-- ============================================================

-- Demo Doctor
INSERT INTO users (id, role, first_name, last_name, email, phone, blood_type, location_city, location_province, everify_status, everify_tier)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'doctor', 'Maria', 'Santos', 'dr.santos@ehealth.gov.ph', '+639171234567', 'O+', 'Manila', 'Metro Manila', 'verified', 'Tier II'),
  ('22222222-2222-2222-2222-222222222222', 'donor', 'Juan', 'Dela Cruz', 'juan.delacruz@example.ph', '+639289876543', 'O-', 'Quezon City', 'Metro Manila', 'verified', 'Tier I'),
  ('33333333-3333-3333-3333-333333333333', 'recipient', 'Ana', 'Reyes', 'ana.reyes@example.ph', '+639151122334', 'A+', 'Makati City', 'Metro Manila', 'verified', 'Tier I')
ON CONFLICT (id) DO NOTHING;

-- Demo Donor Profile
INSERT INTO donor_profiles (user_id, organ_pledges, availability_status, is_blood_donor, age)
VALUES ('22222222-2222-2222-2222-222222222222', ARRAY['kidney'], 'available', TRUE, 32)
ON CONFLICT DO NOTHING;

-- Demo Recipient Request
INSERT INTO recipient_requests (user_id, request_type, blood_type_needed, urgency_level, description, status)
VALUES ('33333333-3333-3333-3333-333333333333', 'blood', 'O-', 'urgent', 'Post-surgery blood transfusion needed urgently.', 'open')
ON CONFLICT DO NOTHING;
