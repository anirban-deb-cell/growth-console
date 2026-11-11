<?php
/**
 * GET api/campaigns/stats.php?id=12&days=30     (days: 7, 30, 90, or 0 = since launch, max 1 year)
 * Conversion for one campaign: landing-page visits (campaign_visits) against
 * enquiries (campaign_leads), in total, per day, and per traffic source.
 *
 * { totals: { visits, visitors, enquiries, taps, won, conversionRate },
 *   daily: [{ date, visits, enquiries, taps }],
 *   bySource: [{ source, medium, campaign, visits, enquiries, taps, conversionRate }],
 *   devices: [{ device, visits }], keywords: [{ term, visits }], from, to }
 */

declare(strict_types=1);
require __DIR__ . '/../lib/bootstrap.php';
require __DIR__ . '/../lib/campaigns.php';

require_method('GET');
require_user();

$row = campaign_find((int) ($_GET['id'] ?? 0));
if (!$row) {
    fail('Campaign not found.', 404);
}
$id = (int) $row['id'];
$days = (int) ($_GET['days'] ?? 30);
if (!in_array($days, [0, 7, 30, 90], true)) {
    $days = 30;
}

// Window: the last N days including today, or since the campaign started (max one year).
$to = new DateTimeImmutable('today');
$from = $days > 0
    ? $to->modify('-' . ($days - 1) . ' days')
    : max(new DateTimeImmutable($row['start_date']), $to->modify('-364 days'));
if ($from > $to) {
    $from = $to;
}
$fromSql = $from->format('Y-m-d 00:00:00');
$pdo = db();
$rate = fn (int $enq, int $visits): ?float => $visits > 0 ? round($enq / $visits * 100, 1) : null;

// ---- Totals ----
$v = $pdo->prepare('SELECT COUNT(*) AS visits, COUNT(DISTINCT visitor_hash, DATE(created_at)) AS visitors FROM campaign_visits WHERE campaign_id = ? AND created_at >= ?');
$v->execute([$id, $fromSql]);
$v = $v->fetch();
$l = $pdo->prepare("SELECT SUM(channel = 'form') AS forms, SUM(channel <> 'form') AS taps, SUM(channel = 'form' AND status = 'won') AS won FROM campaign_leads WHERE campaign_id = ? AND created_at >= ?");
$l->execute([$id, $fromSql]);
$l = $l->fetch();
$totals = [
    'visits' => (int) $v['visits'],
    'visitors' => (int) $v['visitors'],
    'enquiries' => (int) $l['forms'],
    'taps' => (int) $l['taps'],
    'won' => (int) $l['won'],
];
$totals['conversionRate'] = $rate($totals['enquiries'], $totals['visits']);

// ---- Per day (every day in the window, zeros included) ----
$daily = [];
for ($d = $from; $d <= $to; $d = $d->modify('+1 day')) {
    $daily[$d->format('Y-m-d')] = ['date' => $d->format('Y-m-d'), 'visits' => 0, 'enquiries' => 0, 'taps' => 0];
}
$q = $pdo->prepare('SELECT DATE(created_at) AS d, COUNT(*) AS n FROM campaign_visits WHERE campaign_id = ? AND created_at >= ? GROUP BY d');
$q->execute([$id, $fromSql]);
foreach ($q->fetchAll() as $r) {
    if (isset($daily[$r['d']])) $daily[$r['d']]['visits'] = (int) $r['n'];
}
$q = $pdo->prepare("SELECT DATE(created_at) AS d, SUM(channel = 'form') AS forms, SUM(channel <> 'form') AS taps FROM campaign_leads WHERE campaign_id = ? AND created_at >= ? GROUP BY d");
$q->execute([$id, $fromSql]);
foreach ($q->fetchAll() as $r) {
    if (isset($daily[$r['d']])) {
        $daily[$r['d']]['enquiries'] = (int) $r['forms'];
        $daily[$r['d']]['taps'] = (int) $r['taps'];
    }
}

// ---- Per traffic source (utm_source / utm_medium / utm_campaign) ----
$sources = [];
$key = fn (array $r) => implode('|', [$r['source'], $r['medium'], $r['campaign']]);
$q = $pdo->prepare(
    "SELECT COALESCE(NULLIF(utm_source, ''), '(direct)') AS source, COALESCE(NULLIF(utm_medium, ''), '(none)') AS medium, COALESCE(utm_campaign, '') AS campaign, COUNT(*) AS visits
     FROM campaign_visits WHERE campaign_id = ? AND created_at >= ? GROUP BY source, medium, campaign"
);
$q->execute([$id, $fromSql]);
foreach ($q->fetchAll() as $r) {
    $sources[$key($r)] = ['source' => $r['source'], 'medium' => $r['medium'], 'campaign' => $r['campaign'], 'visits' => (int) $r['visits'], 'enquiries' => 0, 'taps' => 0];
}
$q = $pdo->prepare(
    "SELECT COALESCE(NULLIF(utm_source, ''), '(direct)') AS source, COALESCE(NULLIF(utm_medium, ''), '(none)') AS medium, COALESCE(utm_campaign, '') AS campaign,
            SUM(channel = 'form') AS forms, SUM(channel <> 'form') AS taps
     FROM campaign_leads WHERE campaign_id = ? AND created_at >= ? GROUP BY source, medium, campaign"
);
$q->execute([$id, $fromSql]);
foreach ($q->fetchAll() as $r) {
    $k = $key($r);
    $sources[$k] ??= ['source' => $r['source'], 'medium' => $r['medium'], 'campaign' => $r['campaign'], 'visits' => 0, 'enquiries' => 0, 'taps' => 0];
    $sources[$k]['enquiries'] = (int) $r['forms'];
    $sources[$k]['taps'] = (int) $r['taps'];
}
$bySource = array_values(array_map(fn ($s) => $s + ['conversionRate' => $rate($s['enquiries'], $s['visits'])], $sources));
usort($bySource, fn ($a, $b) => [$b['visits'], $b['enquiries']] <=> [$a['visits'], $a['enquiries']]);

// ---- Devices and search keywords (visits) ----
$q = $pdo->prepare("SELECT COALESCE(device, 'unknown') AS device, COUNT(*) AS visits FROM campaign_visits WHERE campaign_id = ? AND created_at >= ? GROUP BY device ORDER BY visits DESC");
$q->execute([$id, $fromSql]);
$devices = array_map(fn ($r) => ['device' => $r['device'], 'visits' => (int) $r['visits']], $q->fetchAll());
$q = $pdo->prepare("SELECT utm_term AS term, COUNT(*) AS visits FROM campaign_visits WHERE campaign_id = ? AND created_at >= ? AND utm_term IS NOT NULL AND utm_term <> '' GROUP BY utm_term ORDER BY visits DESC LIMIT 10");
$q->execute([$id, $fromSql]);
$keywords = array_map(fn ($r) => ['term' => $r['term'], 'visits' => (int) $r['visits']], $q->fetchAll());

ok([
    'campaign' => campaign_admin($row),
    'from' => $from->format('Y-m-d'),
    'to' => $to->format('Y-m-d'),
    'totals' => $totals,
    'daily' => array_values($daily),
    'bySource' => $bySource,
    'devices' => $devices,
    'keywords' => $keywords,
]);
