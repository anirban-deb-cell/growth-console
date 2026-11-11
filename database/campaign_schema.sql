-- Growth Console — campaigns (MySQL 5.7+ / MariaDB 10.4+).
--
-- Import AFTER blog_schema.sql (it uses admin_users). Safe to re-run: every
-- statement is CREATE ... IF NOT EXISTS.
--
-- A campaign is two things kept together:
--   1. the ad setup — channel, audience, budget, schedule, ad copy — that the
--      agency builds and the client approves, and
--   2. where the ad sends people: either the campaign's own landing page on
--      the website (/campaigns/<slug>, not linked from the site's menu — ad
--      traffic only), or an existing page on the site.
--
-- Enquiries from the landing pages are stored in campaign_leads and visits
-- in campaign_visits (both below) — together they give each campaign's conversion rate.
-- Spend, clicks and impressions are NOT stored: they will come from the
-- Google Ads / Meta Ads APIs once those are connected.

CREATE TABLE IF NOT EXISTS campaigns (
  id                INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  site_key          VARCHAR(64)  NOT NULL DEFAULT 'medgrowth',
  name              VARCHAR(160) NOT NULL,

  -- ---- Ad setup ----
  platform          ENUM('google', 'meta') NOT NULL,
  -- Search, Performance Max, Lead form, Click-to-WhatsApp, Reels & Stories
  type              VARCHAR(40)  NOT NULL,
  -- What counts as an enquiry.
  objective         ENUM('calls', 'whatsapp', 'forms', 'visits') NOT NULL,
  -- Hospital clients: the specialty (Orthopedics …). Agency (MedGrowth itself): the service (Local SEO …).
  specialty         VARCHAR(120) NOT NULL,
  branch            VARCHAR(120) NOT NULL DEFAULT 'All branches',
  -- draft → in_review (sent for client approval) → active ⇄ paused → ended
  status            ENUM('draft', 'in_review', 'active', 'paused', 'ended') NOT NULL DEFAULT 'draft',
  -- Result of the healthcare-claims check on the ad and landing page copy.
  compliance        ENUM('pending', 'passed', 'needs_fix') NOT NULL DEFAULT 'pending',
  daily_budget      INT UNSIGNED NOT NULL,          -- INR per day
  start_date        DATE         NOT NULL,
  end_date          DATE         NULL,
  run_schedule      ENUM('desk', 'always') NOT NULL DEFAULT 'desk',  -- desk = front-desk hours only
  location_mode     ENUM('radius', 'cities', 'countries') NOT NULL DEFAULT 'radius',
  radius_km         SMALLINT UNSIGNED NULL,
  -- Arrays stored as JSON: they are always read and written whole.
  locations         JSON         NOT NULL,          -- ["Hyderabad", ...] or ["Each branch + 15 km"]
  languages         JSON         NOT NULL,          -- ["English", "Telugu", ...]
  age_min           TINYINT UNSIGNED NULL,          -- Meta only
  age_max           TINYINT UNSIGNED NULL,
  keywords          JSON         NOT NULL,          -- Google Search only
  headlines         JSON         NOT NULL,
  descriptions      JSON         NOT NULL,

  -- ---- Tracking ----
  tracking_number   TINYINT(1)   NOT NULL DEFAULT 1,
  whatsapp_routing  TINYINT(1)   NOT NULL DEFAULT 1,
  conversion_id     VARCHAR(120) NULL,              -- Google Ads conversion, e.g. AW-123/label

  -- ---- Where the ad sends people ----
  landing_mode      ENUM('page', 'url') NOT NULL DEFAULT 'page',
  landing_url       VARCHAR(500) NULL,              -- landing_mode = url
  slug              VARCHAR(160) NULL,              -- landing_mode = page → /campaigns/<slug>
  lp_headline       VARCHAR(160) NULL,
  lp_subheadline    VARCHAR(300) NULL,
  lp_offer          VARCHAR(160) NULL,              -- e.g. "Free first consultation till 30 Nov"
  lp_body           JSON         NOT NULL,          -- ["paragraph", ...]
  lp_highlights     JSON         NOT NULL,          -- ["NABH accredited", ...] bullet points
  lp_images         JSON         NOT NULL,          -- ["https://.../a.jpg", ...] first = hero
  lp_youtube_id     VARCHAR(20)  NULL,
  lp_cta_label      VARCHAR(40)  NULL,              -- button text, e.g. "Book a consultation"
  phone             VARCHAR(20)  NULL,              -- number the page's call button dials
  whatsapp          VARCHAR(20)  NULL,              -- number the WhatsApp button opens

  created_by        INT UNSIGNED NULL,
  updated_by        INT UNSIGNED NULL,
  created_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  -- NULL slugs (campaigns that use an existing page) don't clash with each other.
  UNIQUE KEY uq_campaigns_site_slug (site_key, slug),
  KEY idx_campaigns_listing (site_key, status, start_date),
  CONSTRAINT fk_campaigns_created_by FOREIGN KEY (created_by) REFERENCES admin_users (id) ON DELETE SET NULL,
  CONSTRAINT fk_campaigns_updated_by FOREIGN KEY (updated_by) REFERENCES admin_users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Every enquiry from the website, worked through in the console's Enquiries
-- inbox: campaign landing pages (the enquiry form, and taps on the page's
-- Call / WhatsApp buttons — no contact details for those, they're counted so
-- every campaign's enquiries add up) and the Contact Us page form (credited
-- to the blog post read before it, if any).
CREATE TABLE IF NOT EXISTS campaign_leads (
  id                INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  site_key          VARCHAR(64)  NOT NULL DEFAULT 'medgrowth',
  -- campaign = a campaign landing page; contact = the website's Contact Us form.
  source            ENUM('campaign', 'contact') NOT NULL DEFAULT 'campaign',
  campaign_id       INT UNSIGNED NULL,
  -- Kept so the enquiry still says where it came from if the campaign is deleted.
  campaign_name     VARCHAR(160) NULL,
  channel           ENUM('form', 'call', 'whatsapp') NOT NULL DEFAULT 'form',
  name              VARCHAR(120) NULL,
  organisation      VARCHAR(160) NULL,          -- hospital / clinic / business name
  phone             VARCHAR(30)  NULL,
  email             VARCHAR(190) NULL,
  city              VARCHAR(120) NULL,
  message           TEXT         NULL,
  role              VARCHAR(120) NULL,          -- contact form: Owner/Director, Doctor …
  service           VARCHAR(160) NULL,          -- contact form: the service they asked about
  consent           TINYINT(1)   NULL,          -- contact form: agreed to be contacted
  -- Contact form: the blog post the visitor read before enquiring (credited to it).
  blog_post_id      INT UNSIGNED NULL,
  blog_title        VARCHAR(255) NULL,
  -- The Google Ads conversion ID of the campaign or blog post the enquiry came from, when one was set.
  conversion_id     VARCHAR(120) NULL,
  utm_source        VARCHAR(60)  NULL,
  utm_medium        VARCHAR(60)  NULL,
  utm_campaign      VARCHAR(120) NULL,
  page_url          VARCHAR(500) NULL,
  -- new → contacted → qualified → won / lost
  status            ENUM('new', 'contacted', 'qualified', 'won', 'lost') NOT NULL DEFAULT 'new',
  notes             TEXT         NULL,
  updated_by        INT UNSIGNED NULL,
  created_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_campaign_leads_site (site_key, created_at),
  KEY idx_campaign_leads_campaign (campaign_id, status),
  KEY idx_campaign_leads_source (site_key, source, created_at),
  KEY idx_campaign_leads_blog (blog_post_id),
  CONSTRAINT fk_campaign_leads_campaign FOREIGN KEY (campaign_id) REFERENCES campaigns (id) ON DELETE SET NULL,
  CONSTRAINT fk_campaign_leads_updated_by FOREIGN KEY (updated_by) REFERENCES admin_users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Every visit to a campaign landing page, with the ad's tracking tags — the
-- other half of conversion: enquiries (campaign_leads) ÷ visits. Written by
-- the website's campaign page; repeat visits by the same person within 30
-- minutes count once. No IP address is stored: visitor_hash is a one-way
-- hash that changes every day, enough to count unique visitors per day.
CREATE TABLE IF NOT EXISTS campaign_visits (
  id                BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  site_key          VARCHAR(64)  NOT NULL DEFAULT 'medgrowth',
  campaign_id       INT UNSIGNED NOT NULL,
  visitor_hash      CHAR(64)     NOT NULL,
  -- From the ad link (?utm_source=…). Without tags, the website fills in what
  -- it can: an auto-tagged Google Ads click → google / cpc, a Facebook click →
  -- facebook / social, another website → its name / referral, else (direct) / (none).
  utm_source        VARCHAR(60)  NULL,
  utm_medium        VARCHAR(60)  NULL,
  utm_campaign      VARCHAR(120) NULL,
  utm_term          VARCHAR(120) NULL,          -- usually the search keyword
  utm_content       VARCHAR(120) NULL,          -- usually which ad / creative
  click_id          ENUM('gclid', 'gbraid', 'wbraid', 'fbclid') NULL,  -- ad-platform click ID present (value not stored)
  referrer_host     VARCHAR(190) NULL,
  device            ENUM('mobile', 'tablet', 'desktop') NULL,
  created_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_campaign_visits_campaign (campaign_id, created_at),
  KEY idx_campaign_visits_dedupe (campaign_id, visitor_hash, created_at),
  CONSTRAINT fk_campaign_visits_campaign FOREIGN KEY (campaign_id) REFERENCES campaigns (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
