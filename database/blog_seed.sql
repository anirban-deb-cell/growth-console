-- =====================================================================
-- Growth Console — blog seed data (optional)
-- The two posts currently hard-coded on medgrowth.co.in, so the console
-- and the website start from the same content. Run AFTER blog_schema.sql.
-- Their placeholder YouTube IDs and photo slots are deliberately left out:
-- add real media from the editor.
-- =====================================================================

SET NAMES utf8mb4;
START TRANSACTION;

INSERT INTO blog_posts (site_key, slug, title, category, excerpt, intro, tags, images, youtube_id, conversion_id, author, status, published_at, read_mins, word_count, seo_score)
VALUES ('medgrowth', 'local-seo-wins-patients', 'How Local SEO Wins Patients Before They Ever Call', 'Local SEO', 'A patient searching "cardiologist near me" decides who to call before your phone ever rings — almost entirely on what Google Business Profile and Maps show them.', '["A patient searching \\"cardiologist near me\\" decides who to call before your phone ever rings — almost entirely on what Google Business Profile and Maps show them. Photos, hours, categories, and reviews do the convincing that used to happen on a call."]', '["Local SEO","Google Business Profile","Reviews","Near Me Search"]', '[]', NULL, 'AW-18387395398/blogLocalSeo', 'MedGrowth editorial team', 'published', '2026-08-20', 6, 131, 80);
SET @post_id = LAST_INSERT_ID();
INSERT INTO blog_sections (post_id, section_key, position, heading, paragraphs) VALUES (@post_id, 'profile-accuracy', 0, 'Get the profile right first', '["Here’s the exact checklist we run for every hospital client before touching a single ad rupee: category accuracy, service-area coverage across every branch, review-response cadence, and structured Q&A that answers what patients actually type.","Most hospitals are missing at least one of these — and it’s usually the one costing them the most patients."]');
INSERT INTO blog_sections (post_id, section_key, position, heading, paragraphs) VALUES (@post_id, 'ownership', 1, 'Someone has to own it', '["None of this requires a bigger marketing budget. It requires someone to own the profile the way they’d own a front desk — because for a growing share of patients, it is the front desk."]');

INSERT INTO blog_posts (site_key, slug, title, category, excerpt, intro, tags, images, youtube_id, conversion_id, author, status, published_at, read_mins, word_count, seo_score)
VALUES ('medgrowth', 'enquiries-to-op-visits', 'Why Your Enquiries Aren''t Turning Into OP Visits', 'Patient Acquisition', '20,000 site visitors and hundreds of enquiries a month — but where does that funnel actually leak? A look at the points hospitals lose patients between click and appointment.', '["A hospital can run a healthy top of funnel — thousands of site visitors, a steady stream of enquiries — and still see almost none of it turn into a booked OP visit. The leak is rarely where marketing teams look first."]', '["Patient Acquisition","Lead Follow-up","OP Conversion","CRM"]', '[]', NULL, 'AW-18387395398/blogEnquiries', 'MedGrowth editorial team', 'published', '2026-08-15', 5, 100, 80);
SET @post_id = LAST_INSERT_ID();
INSERT INTO blog_sections (post_id, section_key, position, heading, paragraphs) VALUES (@post_id, 'follow-up-speed', 0, 'The leak is follow-up speed', '["In the audits we run, the biggest drop is almost always follow-up speed: how long it takes a real person to respond to an enquiry, and whether that response happens on the channel the patient actually used."]');
INSERT INTO blog_sections (post_id, section_key, position, heading, paragraphs) VALUES (@post_id, 'handoff', 1, 'Fix the handoff before the spend', '["Fixing the funnel usually means fixing the handoff between marketing and the front desk before it means spending more on ads."]');

COMMIT;
