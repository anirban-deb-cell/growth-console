-- Migration 004 — Call, WhatsApp and email taps from every page (13 Nov 2026).
--
-- Run ONCE, after 001–003, on a database created before this date. New
-- installs don't need it (campaign_schema.sql includes it). Safe to re-run:
-- MODIFY just restates the columns; "Duplicate column name 'position'" means
-- the ADD has already been run.
--
-- source  'site'  = a tap on any page of the website (website/tap.php)
-- channel 'email' = the Email button (mailto:)
-- position        = where the button was: header / body / footer / floating

ALTER TABLE campaign_leads
  MODIFY COLUMN source  ENUM('campaign', 'contact', 'site') NOT NULL DEFAULT 'campaign',
  MODIFY COLUMN channel ENUM('form', 'call', 'whatsapp', 'email') NOT NULL DEFAULT 'form';

ALTER TABLE campaign_leads
  ADD COLUMN position ENUM('header', 'body', 'footer', 'floating') NULL AFTER channel;
