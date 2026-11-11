<?php
/**
 * GET api/leads/list.php
 * The newest 2,000 enquiries for this site (all statuses), plus a count per
 * status. Filtering by campaign / status / search happens in the console.
 */

declare(strict_types=1);
require __DIR__ . '/../lib/bootstrap.php';
require __DIR__ . '/../lib/leads.php';

require_method('GET');
require_user();

$stmt = db()->prepare(
    'SELECT l.*, COALESCE(c.name, l.campaign_name) AS campaign_name, COALESCE(b.title, l.blog_title) AS blog_title
     FROM campaign_leads l
     LEFT JOIN campaigns c ON c.id = l.campaign_id
     LEFT JOIN blog_posts b ON b.id = l.blog_post_id
     WHERE l.site_key = ? ORDER BY l.created_at DESC, l.id DESC LIMIT 2000'
);
$stmt->execute([site_key()]);
$leads = array_map('lead_admin', $stmt->fetchAll());

$counts = ['all' => count($leads)] + array_fill_keys(LEAD_STATUSES, 0);
foreach ($leads as $l) {
    $counts[$l['status']]++;
}
ok(['leads' => $leads, 'counts' => $counts]);
