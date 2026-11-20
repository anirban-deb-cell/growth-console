<?php
/**
 * Growth Console API configuration — TEMPLATE.
 *
 * Copy this file to `config.php` in the same folder ON THE SERVER and fill in
 * the real values.
 *
 * On your own computer, put local settings (local database, 'env' =>
 * 'development', 'uploads_url' => '/uploads') in `config.local.php` instead:
 * when it exists it is used in place of config.php, so config.php can keep
 * the server's values. config.local.php is never committed or deployed. config.php is gitignored, excluded from the Angular build,
 * and blocked from web access by api/.htaccess — it only ever gets read by PHP.
 */

return [
    // 'production' hides error details from API responses; 'development' shows them.
    'env' => 'production',

    'db' => [
        'host' => 'localhost',
        'name' => 'CHANGE_ME',
        'user' => 'CHANGE_ME',
        'pass' => 'CHANGE_ME',
        'port' => 3306,
    ],

    // Which website this console's blog writes to (blog_posts.site_key).
    'site_key' => 'medgrowth',

    // Public base URL of the website the posts appear on — used to build
    // canonical/preview links in API responses.
    'site_url' => 'https://medgrowth.co.in',

    // Websites allowed to call the PUBLIC read-only endpoints (api/public/*)
    // from the browser. Admin endpoints never send CORS headers: the console
    // must be served from the same origin as this API.
    'public_origins' => [
        'https://medgrowth.co.in',
        'https://preprod.medgrowth.co.in',
    ],

    // Where uploaded images are stored on disk, and the URL they're served from.
    // They are stored in the WEBSITE's public_html/uploads and served from
    // medgrowth.co.in, so blog covers and og:image links point at the main
    // domain. Neither project's build contains an uploads/ folder, so no
    // deploy can overwrite it — but never delete public_html/uploads on the
    // server. The first upload writes its .htaccess (scripts can't run there).
    // Find the absolute path in hPanel → File Manager (both sites must be in
    // the same Hostinger account).
    'uploads_dir' => '/home/CHANGE_ME/domains/medgrowth.co.in/public_html/uploads',
    'uploads_url' => 'https://medgrowth.co.in/uploads',
    'upload_max_bytes' => 5 * 1024 * 1024,

    // Session cookie for the admin login.
    'session' => [
        'name' => 'gc_session',
        // Sign out after this many seconds without activity.
        'idle_timeout' => 4 * 60 * 60,
    ],

    // Lock an account for `lock_minutes` after this many wrong passwords in a row.
    'login' => [
        'max_attempts' => 5,
        'lock_minutes' => 15,
    ],
];
