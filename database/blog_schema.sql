-- =====================================================================
-- Growth Console — Blog module schema
-- MySQL 8.0+ or MariaDB 10.4+ (Hostinger provides either). utf8mb4.
--
-- Run once in phpMyAdmin (Import tab) or over SSH:
--   mysql -u DB_USER -p DB_NAME < database/blog_schema.sql
-- Then optionally load database/blog_seed.sql, and create the first admin
-- login with: php public/api/tools/create_admin.php (see the README).
--
-- NOTE: the old website project (medgrowth-ui/database/schema.sql) also
-- defined a `blog_posts` table with different columns. If that script was
-- ever run against this database, drop those two tables first — the
-- IF NOT EXISTS below would otherwise silently keep the old structure:
--   DROP TABLE IF EXISTS blog_sections; DROP TABLE IF EXISTS blog_posts;
-- =====================================================================

SET NAMES utf8mb4;

-- People who can sign in to the admin console.
CREATE TABLE IF NOT EXISTS admin_users (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  email           VARCHAR(190) NOT NULL,
  name            VARCHAR(120) NOT NULL,
  -- password_hash() output (bcrypt/argon2) — never a plain password.
  password_hash   VARCHAR(255) NOT NULL,
  -- admin: can publish, schedule and delete any post.
  -- editor: can write drafts and send them for review only.
  role            ENUM('admin', 'editor') NOT NULL DEFAULT 'editor',
  is_active       TINYINT(1) NOT NULL DEFAULT 1,
  failed_logins   SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  locked_until    DATETIME NULL,
  last_login_at   DATETIME NULL,
  created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_admin_users_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- One row per blog post. `site_key` lets one console serve several
-- websites later (one per client); today everything is 'medgrowth'.
CREATE TABLE IF NOT EXISTS blog_posts (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  site_key        VARCHAR(64)  NOT NULL DEFAULT 'medgrowth',
  slug            VARCHAR(160) NOT NULL,
  title           VARCHAR(255) NOT NULL,
  category        VARCHAR(120) NOT NULL,
  -- Short summary: list card + meta description.
  excerpt         TEXT         NOT NULL,
  -- Arrays stored as JSON: they are always read and written whole.
  intro           JSON         NOT NULL,   -- ["paragraph", ...]
  tags            JSON         NOT NULL,   -- ["tag", ...]
  images          JSON         NOT NULL,   -- ["https://.../a.jpg", ...] first = cover
  youtube_id      VARCHAR(20)  NULL,
  conversion_id   VARCHAR(120) NULL,       -- Google Ads conversion, e.g. AW-123/label
  author          VARCHAR(160) NULL,       -- author / medical reviewer
  status          ENUM('draft', 'in_review', 'scheduled', 'published') NOT NULL DEFAULT 'draft',
  -- Publish date (or the planned date for drafts / scheduled posts).
  published_at    DATE         NOT NULL,
  read_mins       SMALLINT UNSIGNED NOT NULL DEFAULT 1,
  word_count      INT UNSIGNED NOT NULL DEFAULT 0,
  seo_score       TINYINT UNSIGNED NOT NULL DEFAULT 0,
  created_by      INT UNSIGNED NULL,
  updated_by      INT UNSIGNED NULL,
  created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_blog_posts_site_slug (site_key, slug),
  KEY idx_blog_posts_listing (site_key, status, published_at),
  CONSTRAINT fk_blog_posts_created_by FOREIGN KEY (created_by) REFERENCES admin_users (id) ON DELETE SET NULL,
  CONSTRAINT fk_blog_posts_updated_by FOREIGN KEY (updated_by) REFERENCES admin_users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Sub topics (headed sections) of a post, in display order.
CREATE TABLE IF NOT EXISTS blog_sections (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  post_id         INT UNSIGNED NOT NULL,
  -- Anchor id used by the table of contents, e.g. "profile-accuracy".
  section_key     VARCHAR(160) NOT NULL,
  position        SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  heading         VARCHAR(255) NOT NULL,
  paragraphs      JSON         NOT NULL,   -- ["paragraph", ...]
  image           VARCHAR(500) NULL,
  youtube_id      VARCHAR(20)  NULL,
  KEY idx_blog_sections_post (post_id, position),
  CONSTRAINT fk_blog_sections_post FOREIGN KEY (post_id) REFERENCES blog_posts (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Every image uploaded through the editor — lets you find and clean up
-- files later, and records who uploaded what.
CREATE TABLE IF NOT EXISTS blog_uploads (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  site_key        VARCHAR(64)  NOT NULL DEFAULT 'medgrowth',
  url             VARCHAR(500) NOT NULL,
  path            VARCHAR(500) NOT NULL,   -- relative to the uploads folder
  original_name   VARCHAR(255) NOT NULL,
  mime            VARCHAR(50)  NOT NULL,
  bytes           INT UNSIGNED NOT NULL,
  width           SMALLINT UNSIGNED NULL,
  height          SMALLINT UNSIGNED NULL,
  uploaded_by     INT UNSIGNED NULL,
  created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_blog_uploads_site (site_key, created_at),
  CONSTRAINT fk_blog_uploads_user FOREIGN KEY (uploaded_by) REFERENCES admin_users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Who did what, when. Written by the API on login, save, publish, delete.
CREATE TABLE IF NOT EXISTS audit_log (
  id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id         INT UNSIGNED NULL,
  action          VARCHAR(40)  NOT NULL,   -- login, login_failed, post_saved, post_deleted, upload ...
  entity          VARCHAR(40)  NULL,       -- 'post', 'upload', 'user'
  entity_id       VARCHAR(64)  NULL,
  details         JSON         NULL,
  ip              VARCHAR(45)  NULL,
  created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_audit_log_entity (entity, entity_id),
  KEY idx_audit_log_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Every visit to a published blog post, with the visit's tracking tags —
-- the blog's visits / conversion in the console. Written by the website's
-- post page; repeat visits by the same person within 30 minutes count once.
-- No IP address is stored: visitor_hash is a one-way hash that changes daily.
CREATE TABLE IF NOT EXISTS blog_visits (
  id                BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  site_key          VARCHAR(64)  NOT NULL DEFAULT 'medgrowth',
  post_id           INT UNSIGNED NOT NULL,
  visitor_hash      CHAR(64)     NOT NULL,
  utm_source        VARCHAR(60)  NULL,          -- or google / organic, a referring site, (direct)
  utm_medium        VARCHAR(60)  NULL,
  utm_campaign      VARCHAR(120) NULL,
  referrer_host     VARCHAR(190) NULL,
  device            ENUM('mobile', 'tablet', 'desktop') NULL,
  created_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_blog_visits_post (post_id, created_at),
  KEY idx_blog_visits_dedupe (post_id, visitor_hash, created_at),
  CONSTRAINT fk_blog_visits_post FOREIGN KEY (post_id) REFERENCES blog_posts (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
