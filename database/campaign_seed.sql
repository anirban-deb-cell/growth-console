  -- Growth Console — 2 sample campaigns for MedGrowth Digital's own website.
  --
  -- Import AFTER campaign_schema.sql. Both are launched ('active'), so their
  -- landing pages work straight away:
  --   https://medgrowth.co.in/campaigns/free-growth-audit
  --   https://medgrowth.co.in/campaigns/hospital-google-ads
  -- Photos: the 4 images in medgrowth-ui/public/assets/images/campaigns/ (part of
  -- the website build, so they're served by the website itself).
  -- Video: add your own YouTube video (any watch / youtu.be / shorts link's ID):
  --   UPDATE campaigns SET lp_youtube_id = 'YOUR_VIDEO_ID' WHERE slug = 'free-growth-audit';
  --   UPDATE campaigns SET lp_youtube_id = 'YOUR_VIDEO_ID' WHERE slug = 'hospital-google-ads';
  -- or paste the link in the console: Campaigns → Edit → Landing page → YouTube video.
  -- Re-running is safe: an existing campaign only gets its photos refreshed.
  -- To remove them: DELETE FROM campaigns WHERE slug IN ('free-growth-audit', 'hospital-google-ads');

  INSERT INTO campaigns (
    site_key, name, platform, type, objective, specialty, branch, status, compliance,
    daily_budget, start_date, end_date, run_schedule, location_mode, radius_km,
    locations, languages, age_min, age_max, keywords, headlines, descriptions,
    tracking_number, whatsapp_routing, conversion_id,
    landing_mode, landing_url, slug,
    lp_headline, lp_subheadline, lp_offer, lp_body, lp_highlights, lp_images, lp_youtube_id, lp_cta_label,
    phone, whatsapp
  ) VALUES
  (
    'medgrowth', 'Free growth audit · Google Search', 'google', 'Search', 'forms', 'Complete growth package', 'All branches', 'active', 'passed',
    1500, '2026-11-10', NULL, 'desk', 'cities', NULL,
    '["Hyderabad", "Secunderabad", "Warangal", "Vijayawada"]', '["English", "Telugu"]', NULL, NULL,
    '["hospital marketing agency hyderabad", "healthcare digital marketing", "digital marketing for hospitals", "clinic marketing agency"]',
    '["Free Growth Audit for Hospitals", "More Patients From Google", "Healthcare Marketing Experts"]',
    '["See exactly why patients pick other hospitals on Google. Book your free 30-minute audit."]',
    1, 1, NULL,
    'page', NULL, 'free-growth-audit',
    'Get more patients from Google — start with a free growth audit',
    'We review your Google Business Profile, website, reviews and ads, and show you the 5 fixes that bring the most patients.',
    'Free audit · 10 slots this month',
    '["Most hospitals lose patients before the first phone call: an outdated Google Business Profile, few recent reviews, or a website that doesn''t load on mobile.", "In a 30-minute call we walk you through what patients see when they search for your specialty in your city, and what to fix first. No obligation."]',
    '["Google Business Profile and Maps check", "Website speed and mobile check", "Reviews and reputation snapshot", "Clear 90-day action plan"]',
    '["/assets/images/campaigns/free-growth-audit-1.jpg", "/assets/images/campaigns/free-growth-audit-2.jpg"]', NULL, 'Book my free audit',
    '+91 98540 16767', '+91 98540 16767'
  ),
  (
    'medgrowth', 'Google Ads for hospitals · Meta lead form', 'meta', 'Lead form', 'whatsapp', 'Google Ads', 'All branches', 'active', 'passed',
    1000, '2026-11-10', '2026-12-31', 'always', 'radius', 25,
    '["Hyderabad + 25 km"]', '["English", "Hindi", "Telugu"]', 28, 60, '[]',
    '["Is your ad spend bringing patients?"]',
    '["Hospitals in Hyderabad: we set up and run Google Ads that track every call and enquiry. Chat with us on WhatsApp."]',
    1, 1, NULL,
    'page', NULL, 'hospital-google-ads',
    'Google Ads that bring patients, not just clicks',
    'Search campaigns built for hospitals and clinics — every call, WhatsApp and form tracked back to the ad that brought it.',
    'First month''s setup free — offer ends 31 Dec',
    '["Generic agencies run healthcare ads like any other business, and Google disapproves them or they attract the wrong searches.", "We write compliant ad copy, target the specialties and areas you actually serve, and report enquiries and cost per enquiry every week."]',
    '["Healthcare-compliant ad copy", "Call and WhatsApp tracking", "Weekly enquiry report", "No long lock-in"]',
    '["/assets/images/campaigns/hospital-google-ads-1.jpg", "/assets/images/campaigns/hospital-google-ads-2.jpg"]', NULL, 'Chat with us on WhatsApp',
    '+91 98540 16767', '+91 98540 16767'
  )
  -- Already imported? Re-running only refreshes the photos.
  ON DUPLICATE KEY UPDATE lp_images = VALUES(lp_images);
