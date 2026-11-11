# Growth Console (code name)

Agency admin console for healthcare marketing — Angular 19, standalone
components, signals — with a plain-PHP + MySQL API for Hostinger.

**Current release: Blog only.** Every other module (portfolio, overview,
campaigns, SEO, reputation, global patients) is switched off in
`src/app/core/config/features.ts`; their code is kept and comes back by
adding them to `FEATURES.modules`.

## Run

```bash
npm install
npm start            # http://localhost:4200 — sample data, no backend needed
npm run build        # production build (talks to the PHP API) → dist/growth-console/browser
```

`src/environments/environment*.ts` decide where data comes from:
`dataSource: 'mock'` (sample data kept in the browser — the `npm start`
default) or `'api'` (the PHP backend — the production default).

## Blog & Campaigns API (PHP + MySQL)

```
database/blog_schema.sql      tables: admin_users, blog_posts, blog_sections, blog_uploads, audit_log
database/blog_seed.sql        optional: the 2 posts currently on medgrowth.co.in
database/campaign_schema.sql  tables: campaigns (ad setup + landing page), campaign_leads (enquiries), campaign_visits (landing-page visits) — import after blog_schema.sql
database/campaign_seed.sql    optional: 2 sample campaigns for medgrowth.co.in
public/api/
  config.example.php          copy to config.php on the server and fill in
  lib/bootstrap.php           config, JSON responses, DB, session login, audit
  lib/input.php               shared input validation (strings, lists, images, slugs)
  lib/upload.php              shared image upload (re-encode, strip metadata, resize)
  lib/blog.php                blog validation + row ↔ JSON mapping
  lib/campaigns.php           campaign validation, status rules + row ↔ JSON mapping
  lib/leads.php               enquiry statuses + row ↔ JSON mapping
  auth/login.php · logout.php · me.php
  blog/list.php · get.php · save.php · delete.php · upload.php   (signed-in only)
  campaigns/list.php · get.php · save.php · status.php · delete.php · upload.php · stats.php
  leads/list.php · update.php · delete.php
  public/posts.php · post.php                                    (read-only, for the website)
  tools/create_admin.php      CLI: create an admin login
public/uploads/               uploaded images (PHP execution disabled)
```

| Endpoint | Method | Who |
|---|---|---|
| `api/auth/login.php` `{email,password}` | POST | anyone (locks after 5 wrong passwords for 15 min) |
| `api/auth/me.php` · `api/auth/logout.php` | GET · POST | signed in |
| `api/blog/list.php?status=&q=` | GET | signed in |
| `api/blog/get.php?id=` | GET | signed in |
| `api/blog/save.php` (create when no `id`) | POST | signed in; publishing/scheduling needs **admin** |
| `api/blog/delete.php` `{id}` | POST | admin: any post · editor: drafts & in review |
| `api/blog/upload.php` (multipart `file`) | POST | signed in; JPG/PNG/WebP ≤ 5 MB, re-encoded (metadata stripped) |
| `api/public/posts.php` · `api/public/post.php?slug=` | GET | public; published + due scheduled posts only |
| `api/campaigns/list.php` · `get.php?id=` | GET | signed in |
| `api/campaigns/save.php` (create when no `id`) | POST | signed in; saves as draft / in review (live campaigns: admin only) |
| `api/campaigns/status.php` `{id,status}` | POST | **admin**: approve & launch, pause, resume, end, send back |
| `api/campaigns/delete.php` `{id}` | POST | not while live · admin: any · editor: drafts & in review |
| `api/campaigns/upload.php` (multipart `file`) | POST | signed in; landing-page images, same rules as blog |
| `api/campaigns/stats.php?id=&days=7\|30\|90\|0` | GET | signed in; visits vs enquiries — totals, per day, per traffic source, devices, keywords |
| `api/leads/list.php` | GET | signed in; newest 2,000 enquiries + count per status |
| `api/leads/update.php` `{id,status?,notes?}` | POST | signed in; new → contacted → qualified → won / lost |
| `api/leads/delete.php` `{id}` | POST | **admin**; removes the person's details for good (spam / deletion requests) |

Campaigns: a campaign is the ad setup (channel, audience, budget, ad copy)
plus where the ad sends people — its own landing page on the website
(`/campaigns/<slug>`, not in the site menu; the website side comes later) or
an existing page. Flow: draft → in review (client approval) → active ⇄ paused
→ ended; a campaign whose copy fails the healthcare-claims check can't be
launched. Enquiries from the landing pages (form submissions and Call /
WhatsApp taps) and from the website's Contact Us form land in
`campaign_leads` (`source` = campaign / contact) and are worked in the
**Enquiries** inbox. A contact-form enquiry whose ad tags name a campaign is
credited to it. Every landing-page visit is logged in `campaign_visits` with its
UTM tags (source, medium, campaign, term, content), click-ID type, referrer
and device — no IP addresses, only a daily-rotating hash — so each
campaign's Performance page shows conversion (enquiries ÷ visits) per
traffic source. Spend and clicks are not stored — they'll come from the Google
Ads / Meta Ads APIs.

Client kind: a client with `kind: 'agency'` (MedGrowth itself) gets campaigns
for winning new business — **Service** (Local SEO, Google Ads …) instead of
Specialty, no branches, business-facing wording (see
`src/app/core/data/audience.ts`). Hospital clients keep the patient wording.

Security: session cookie is HttpOnly + SameSite=Strict; every POST also
needs the `X-Requested-With: XMLHttpRequest` header the console sends (CSRF
guard); passwords are `password_hash`ed; every save/publish/delete/upload
is written to `audit_log`; `config.php`, `lib/` and `tools/` are blocked
from the web by `.htaccess`.

## Deploy to Hostinger (e.g. admin.medgrowth.co.in)

1. **hPanel → Websites → add a subdomain** `admin.medgrowth.co.in` (own
   folder, e.g. `public_html/admin`), and turn on its free SSL.
2. **hPanel → Databases → MySQL**: create a database + user. Open
   phpMyAdmin → Import `database/blog_schema.sql`, then
   `database/campaign_schema.sql`, then (optional) `database/blog_seed.sql`.
   Already deployed? Import `campaign_schema.sql` again — it only adds the
   tables that are missing — then run each file in `database/migrations/`
   you haven't run yet, once, in order.
3. `npm run build` and upload the **contents** of
   `dist/growth-console/browser/` to the subdomain folder — including the
   hidden `.htaccess` files and the `api/` and `uploads/` folders.
4. On the server, copy `api/config.example.php` → `api/config.php` and set
   the database name/user/password, `uploads_url`
   (`https://admin.medgrowth.co.in/uploads`) and `public_origins`.
5. Create your login over SSH (from the subdomain folder):
   `php api/tools/create_admin.php you@medgrowth.co.in "Your Name" admin`
6. Open `https://admin.medgrowth.co.in`, sign in, write a post.

On later deploys, upload the new build **without deleting** `api/config.php`
or `uploads/` on the server. PHP 8.1+ with the `pdo_mysql`, `gd` and
`fileinfo` extensions is required (all on by default on Hostinger).

### Running the API locally

Needs PHP 8.1+ and a MySQL/MariaDB server. Create `public/api/config.local.php`
(used instead of `config.php` when present, so `config.php` can keep the
server's values; never committed or deployed) with `'env' => 'development'`, local DB details and
`'uploads_url' => '/uploads'`, import the schema,
then:

The PHP port is set once in `package.json` → `"config": { "phpPort": 8090 }`;
both `npm run start:php` and the dev-server proxy (`proxy.conf.cjs`) read it.
It only matters locally — on Hostinger PHP runs inside the web server.


```bash
npm run start:php    # PHP API on localhost:8090 (dev server proxies /api and /uploads here)
# set dataSource: 'api' in src/environments/environment.development.ts
npm start
```

## Screens

| Route | Screen |
|---|---|
| `/login` | Admin sign-in (API mode) |
| `/portfolio` | Agency portfolio — all clients, alerts, integrations, reports |
| `/overview` | Client overview — KPIs, patient journey, sources, specialty table |
| `/campaigns` | All campaigns — filters, totals, pacing, pause/resume, AI compliance fix |
| `/campaigns/new` | New campaign — 5-step wizard with estimate, ad preview, compliance check |
| `/seo` | Search Console / GA4 view |
| `/blog` | All blog posts — status filters, SEO score, ready-for-Google checks |
| `/blog/new`, `/blog/:id/edit` | Blog editor with the publish pipeline (from the MedGrowth preprod admin) |
| `/reputation` | Google reviews with AI reply drafts |
| `/global-patients` | International patient pipeline, currencies, quotes |

## Structure

```
src/app/
  core/
    auth/        sign-in page, session service, guard, HTTP interceptor
    config/      features.ts — which modules this build shows
    data/        models.ts (domain types), mock-data.ts, stores.ts (signal stores)
    layout/      shell + sidebar
    modules/     module-registry.ts (sidebar entries), module.guard.ts
  shared/        charts, icon, format helpers, compliance checker
  features/      one folder per module, lazy-loaded from app.routes.ts
```

- **Modules:** each client has a `modules` list. The sidebar and route guards
  only allow those modules, so the same build serves a dental chain and a
  multispeciality hospital. Adding a module = an entry in
  `module-registry.ts` + its lazy route.
- **Data:** the blog pages read through `BlogRepository`
  (`features/blog/blog-repository.ts`): `HttpBlogRepository` calls the PHP
  API, `MockBlogRepository` uses sample data saved in `localStorage` (keys
  starting `gc:v2:` — clear them to reset the demo). The other modules still
  read the sample stores in `core/data/stores.ts`.
- **Compliance check:** `shared/compliance.ts` is a rule-based stand-in for the
  AI healthcare-ads check, shared by the campaign wizard and the blog editor.
