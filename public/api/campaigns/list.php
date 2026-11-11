<?php
/**
 * GET api/campaigns/list.php
 * Every campaign for this site (all statuses), newest first, with its
 * enquiry counts, plus a count per status for the filter tabs.
 */

declare(strict_types=1);
require __DIR__ . '/../lib/bootstrap.php';
require __DIR__ . '/../lib/campaigns.php';

require_method('GET');
require_user();

$stmt = db()->prepare('SELECT * FROM campaigns WHERE site_key = ? ORDER BY updated_at DESC, id DESC');
$stmt->execute([site_key()]);
$rows = $stmt->fetchAll();

// Enquiries per campaign in one query: form enquiries, taps on Call / WhatsApp, and how many are still new.
$leadStats = db()->prepare(
    "SELECT campaign_id, SUM(channel = 'form') AS forms, SUM(channel <> 'form') AS taps, SUM(status = 'new' AND channel = 'form') AS fresh
     FROM campaign_leads WHERE site_key = ? AND campaign_id IS NOT NULL GROUP BY campaign_id"
);
$leadStats->execute([site_key()]);
$stats = [];
foreach ($leadStats->fetchAll() as $s) {
    $stats[(int) $s['campaign_id']] = $s;
}

// Landing-page visits per campaign, for the conversion rate.
$visitStats = db()->prepare('SELECT v.campaign_id, COUNT(*) AS visits FROM campaign_visits v JOIN campaigns c ON c.id = v.campaign_id WHERE c.site_key = ? GROUP BY v.campaign_id');
$visitStats->execute([site_key()]);
$visits = array_column($visitStats->fetchAll(), 'visits', 'campaign_id');

$campaigns = array_map(function (array $row) use ($stats, $visits): array {
    $s = $stats[(int) $row['id']] ?? null;
    return campaign_admin($row) + [
        'leadCount' => (int) ($s['forms'] ?? 0),
        'tapCount' => (int) ($s['taps'] ?? 0),
        'newLeadCount' => (int) ($s['fresh'] ?? 0),
        'visitCount' => (int) ($visits[(int) $row['id']] ?? 0),
    ];
}, $rows);

$counts = ['all' => count($campaigns)] + array_fill_keys(CAMPAIGN_STATUSES, 0);
foreach ($campaigns as $c) {
    $counts[$c['status']]++;
}

ok(['campaigns' => $campaigns, 'counts' => $counts]);
