-- Migration 002: Alpha Onboarding, Invitations, Outbox, and Delivery Tracking
-- Additive and reversible

-- 1. Additive columns for early_access_applications
ALTER TABLE early_access_applications
  ADD COLUMN IF NOT EXISTS platform_user_id VARCHAR(64),
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS approved_by VARCHAR(120),
  ADD COLUMN IF NOT EXISTS declined_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS declined_by VARCHAR(120);

-- 2. Account invitations table (storing cryptographic token hashes only)
CREATE TABLE IF NOT EXISTS account_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES early_access_applications(id) ON DELETE CASCADE,
  email VARCHAR(254) NOT NULL,
  token_hash CHAR(64) NOT NULL UNIQUE,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'delivered', 'consumed', 'revoked', 'expired')),
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  resend_message_id VARCHAR(100),
  platform_user_id VARCHAR(64),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invitations_token_hash ON account_invitations(token_hash);
CREATE INDEX IF NOT EXISTS idx_invitations_email ON account_invitations(email);
CREATE INDEX IF NOT EXISTS idx_invitations_app_id ON account_invitations(application_id);
CREATE INDEX IF NOT EXISTS idx_invitations_status ON account_invitations(status);

-- 3. Administrator approval audit history
CREATE TABLE IF NOT EXISTS applicant_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES early_access_applications(id) ON DELETE CASCADE,
  action VARCHAR(20) NOT NULL CHECK (action IN ('approved', 'declined', 'revoked')),
  admin_identifier VARCHAR(120) NOT NULL,
  reason TEXT,
  ip_address VARCHAR(64),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_approvals_app_created ON applicant_approvals(application_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_approvals_admin ON applicant_approvals(admin_identifier);

-- 4. Durable email outbox and delivery attempts
CREATE TABLE IF NOT EXISTS email_outbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_email VARCHAR(254) NOT NULL,
  template_type VARCHAR(50) NOT NULL CHECK (template_type IN ('early_access_confirmation', 'craft_community_acknowledgment', 'alpha_invitation')),
  subject VARCHAR(255) NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sending', 'sent', 'delivered', 'failed', 'bounced', 'complained')),
  idempotency_key VARCHAR(128) NOT NULL UNIQUE,
  resend_message_id VARCHAR(100),
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  last_attempt_at TIMESTAMPTZ,
  next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_outbox_dispatch ON email_outbox(status, next_attempt_at) WHERE status IN ('pending', 'failed');
CREATE INDEX IF NOT EXISTS idx_outbox_resend_id ON email_outbox(resend_message_id);
CREATE INDEX IF NOT EXISTS idx_outbox_recipient ON email_outbox(recipient_email);
CREATE INDEX IF NOT EXISTS idx_outbox_idempotency ON email_outbox(idempotency_key);

-- 5. Resend message delivery events (received via Svix webhook)
CREATE TABLE IF NOT EXISTS email_delivery_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  outbox_id UUID REFERENCES email_outbox(id) ON DELETE SET NULL,
  resend_message_id VARCHAR(100) NOT NULL,
  event_type VARCHAR(50) NOT NULL CHECK (event_type IN ('email.sent', 'email.delivered', 'email.delivery_delayed', 'email.bounced', 'email.complained', 'email.opened', 'email.clicked')),
  recipient_email VARCHAR(254) NOT NULL,
  webhook_event_id VARCHAR(128) UNIQUE,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  occurred_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_delivery_events_resend_id ON email_delivery_events(resend_message_id);
CREATE INDEX IF NOT EXISTS idx_delivery_events_event_type ON email_delivery_events(event_type);
CREATE INDEX IF NOT EXISTS idx_delivery_events_occurred_at ON email_delivery_events(occurred_at DESC);
