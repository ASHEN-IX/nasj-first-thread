-- Reversible down-migration for 002_alpha_onboarding.sql

DROP TABLE IF EXISTS email_delivery_events;
DROP TABLE IF EXISTS email_outbox;
DROP TABLE IF EXISTS applicant_approvals;
DROP TABLE IF EXISTS account_invitations;

ALTER TABLE early_access_applications
  DROP COLUMN IF EXISTS platform_user_id,
  DROP COLUMN IF EXISTS approved_at,
  DROP COLUMN IF EXISTS approved_by,
  DROP COLUMN IF EXISTS declined_at,
  DROP COLUMN IF EXISTS declined_by;
