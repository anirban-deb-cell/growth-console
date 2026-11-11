-- Migration 002 — blog visits and enquiries from blog posts (10 Nov 2026).
--
-- Run ONCE, after 001, on a database created before this date. New installs
-- don't need it (blog_schema.sql and campaign_schema.sql include all of it).
-- "Duplicate column name 'blog_post_id'" means it has already been run.

ALTER TABLE campaign_leads
  ADD COLUMN blog_post_id  INT UNSIGNED NULL AFTER consent,
  ADD COLUMN blog_title    VARCHAR(255) NULL AFTER blog_post_id,
  ADD COLUMN conversion_id VARCHAR(120) NULL AFTER blog_title,
  ADD KEY idx_campaign_leads_blog (blog_post_id);

CREATE TABLE IF NOT EXISTS blog_visits (
  id                BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  site_key          VARCHAR(64)  NOT NULL DEFAULT 'medgrowth',
  post_id           INT UNSIGNED NOT NULL,
  visitor_hash      CHAR(64)     NOT NULL,
  utm_source        VARCHAR(60)  NULL,
  utm_medium        VARCHAR(60)  NULL,
  utm_campaign      VARCHAR(120) NULL,
  referrer_host     VARCHAR(190) NULL,
  device            ENUM('mobile', 'tablet', 'desktop') NULL,
  created_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_blog_visits_post (post_id, created_at),
  KEY idx_blog_visits_dedupe (post_id, visitor_hash, created_at),
  CONSTRAINT fk_blog_visits_post FOREIGN KEY (post_id) REFERENCES blog_posts (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
