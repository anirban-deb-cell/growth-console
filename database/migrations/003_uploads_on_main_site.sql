-- Migration 003 — uploaded images move to medgrowth.co.in (13 Nov 2026).
--
-- Images used to be stored in the admin console's own uploads/ folder and
-- served from admin.medgrowth.co.in. They now live in the website's
-- public_html/uploads and are served from medgrowth.co.in (see uploads_dir /
-- uploads_url in api/config.example.php).
--
-- Before running:
--   1. Copy any images that still exist from the admin site's uploads/ folder
--      into medgrowth.co.in's public_html/uploads/ (same sub-folders).
--   2. Update uploads_dir and uploads_url in the server's api/config.php.
-- Then run this ONCE. It only rewrites the start of each stored address, so
-- running it twice changes nothing. Images that were already lost must be
-- re-uploaded in the editor.

UPDATE blog_posts
  SET images = REPLACE(images, 'https://admin.medgrowth.co.in/uploads/', 'https://medgrowth.co.in/uploads/')
  WHERE images LIKE '%https://admin.medgrowth.co.in/uploads/%';
UPDATE blog_sections
  SET image = REPLACE(image, 'https://admin.medgrowth.co.in/uploads/', 'https://medgrowth.co.in/uploads/')
  WHERE image LIKE 'https://admin.medgrowth.co.in/uploads/%';
UPDATE blog_uploads
  SET url = REPLACE(url, 'https://admin.medgrowth.co.in/uploads/', 'https://medgrowth.co.in/uploads/')
  WHERE url LIKE 'https://admin.medgrowth.co.in/uploads/%';
UPDATE campaigns
  SET lp_images = REPLACE(lp_images, 'https://admin.medgrowth.co.in/uploads/', 'https://medgrowth.co.in/uploads/')
  WHERE lp_images LIKE '%https://admin.medgrowth.co.in/uploads/%';
