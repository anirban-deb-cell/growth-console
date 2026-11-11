-- Migration 001 — Contact Us enquiries in the Enquiries inbox (9 Nov 2026).
--
-- Run ONCE on a database that already has campaign_leads (created by an
-- earlier campaign_schema.sql). New installs don't need it: campaign_schema.sql
-- already includes these columns. Running it twice fails with "Duplicate
-- column name 'source'" — that just means it's already done.

ALTER TABLE campaign_leads
  ADD COLUMN source  ENUM('campaign', 'contact') NOT NULL DEFAULT 'campaign' AFTER site_key,
  ADD COLUMN role    VARCHAR(120) NULL AFTER message,
  ADD COLUMN service VARCHAR(160) NULL AFTER role,
  ADD COLUMN consent TINYINT(1)   NULL AFTER service,
  ADD KEY idx_campaign_leads_source (site_key, source, created_at);
