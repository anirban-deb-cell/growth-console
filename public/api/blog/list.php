<?php
/**
 * GET api/blog/list.php[?status=draft&q=knee]
 * All posts for this site (every status) for the console's "All posts"
 * table, newest first, plus a count per status for the filter tabs.
 */

declare(strict_types=1);
require __DIR__ . '/../lib/bootstrap.php';
require __DIR__ . '/../lib/blog.php';

require_method('GET');
require_user();

$rows = db()->prepare('SELECT * FROM blog_posts WHERE site_key = ? ORDER BY published_at DESC, updated_at DESC');
$rows->execute([site_key()]);
$rows = $rows->fetchAll();

// Which posts have a video inside a sub topic (for the "Video" check) — one query, not one per post.
$videoPosts = db()->prepare('SELECT DISTINCT s.post_id FROM blog_sections s JOIN blog_posts p ON p.id = s.post_id WHERE p.site_key = ? AND s.youtube_id IS NOT NULL');
$videoPosts->execute([site_key()]);
$videoPosts = array_flip(array_map('intval', $videoPosts->fetchAll(PDO::FETCH_COLUMN)));

// Visits and enquiries per post (all time), for the blog's conversion — one query each.
$visits = db()->prepare('SELECT v.post_id, COUNT(*) AS n FROM blog_visits v JOIN blog_posts p ON p.id = v.post_id WHERE p.site_key = ? GROUP BY v.post_id');
$visits->execute([site_key()]);
$visits = array_column($visits->fetchAll(), 'n', 'post_id');
$leads = db()->prepare("SELECT blog_post_id, COUNT(*) AS n, SUM(status = 'new') AS fresh FROM campaign_leads WHERE site_key = ? AND blog_post_id IS NOT NULL GROUP BY blog_post_id");
$leads->execute([site_key()]);
$leadStats = [];
foreach ($leads->fetchAll() as $l) {
    $leadStats[(int) $l['blog_post_id']] = $l;
}

$all = array_map(fn ($r) => blog_admin_summary($r, isset($videoPosts[(int) $r['id']])) + [
    'visitCount' => (int) ($visits[(int) $r['id']] ?? 0),
    'leadCount' => (int) ($leadStats[(int) $r['id']]['n'] ?? 0),
    'newLeadCount' => (int) ($leadStats[(int) $r['id']]['fresh'] ?? 0),
], $rows);

$counts = ['all' => count($all)] + array_fill_keys(BLOG_STATUSES, 0);
foreach ($all as $p) {
    $counts[$p['status']]++;
}

$status = (string) ($_GET['status'] ?? '');
$q = mb_strtolower(trim((string) ($_GET['q'] ?? '')));
$posts = array_values(array_filter($all, fn ($p) =>
    ($status === '' || $status === 'all' || $p['status'] === $status) &&
    ($q === '' || str_contains(mb_strtolower($p['title']), $q) || str_contains(mb_strtolower($p['category']), $q))
));

ok(['posts' => $posts, 'counts' => $counts]);
