-- Execute once in the Neon SQL editor (or with psql). No demo applicant data is seeded.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS early_access_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name VARCHAR(120) NOT NULL,
  email VARCHAR(254) NOT NULL UNIQUE,
  participant_role VARCHAR(24) NOT NULL CHECK (participant_role IN ('company','association','artisan','supporter')),
  organization VARCHAR(160),
  location VARCHAR(120),
  testing_interest TEXT NOT NULL,
  contact_consent_at TIMESTAMPTZ NOT NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','reviewing','invited','declined')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS craft_community_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_name VARCHAR(120) NOT NULL,
  email VARCHAR(254) NOT NULL UNIQUE,
  phone VARCHAR(40),
  organization_name VARCHAR(160),
  participant_type VARCHAR(30) NOT NULL CHECK (participant_type IN ('artisan','cooperative','association','workshop','craft_business','community_member','other')),
  region VARCHAR(120) NOT NULL,
  craft_types TEXT[] NOT NULL,
  about_work TEXT NOT NULL,
  website_url VARCHAR(300),
  open_to_collaboration BOOLEAN NOT NULL DEFAULT false,
  contact_consent_at TIMESTAMPTZ NOT NULL,
  status VARCHAR(16) NOT NULL DEFAULT 'new' CHECK (status IN ('new','reviewing','contacted','archived')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_early_access_created_at ON early_access_applications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_early_access_role_status ON early_access_applications(participant_role,status);
CREATE INDEX IF NOT EXISTS idx_craft_community_type ON craft_community_submissions(participant_type);
CREATE INDEX IF NOT EXISTS idx_craft_community_created_at ON craft_community_submissions(created_at DESC);

-- Counters automatically expire logically; clean old rows periodically if needed.
CREATE TABLE IF NOT EXISTS submission_rate_limits (
  request_fingerprint CHAR(64) NOT NULL,
  route_key VARCHAR(32) NOT NULL,
  window_start TIMESTAMPTZ NOT NULL,
  request_count INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (request_fingerprint, route_key, window_start)
);
