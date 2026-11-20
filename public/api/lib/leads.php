<?php
/**
 * Enquiry (lead) helpers: statuses and the JSON shape the console uses
 * (the Lead interface in src/app/core/data/models.ts).
 */

declare(strict_types=1);
require_once __DIR__ . '/input.php';

const LEAD_STATUSES = ['new', 'contacted', 'qualified', 'won', 'lost'];

function lead_admin(array $row): array
{
    return [
        'id' => (string) $row['id'],
        'source' => $row['source'] ?? 'campaign',
        'campaignId' => $row['campaign_id'] === null ? null : (string) $row['campaign_id'],
        'campaignName' => $row['campaign_name'] ?? null,
        'channel' => $row['channel'],
        'position' => $row['position'] ?? null,
        'name' => $row['name'],
        'organisation' => $row['organisation'],
        'phone' => $row['phone'],
        'email' => $row['email'],
        'city' => $row['city'],
        'message' => $row['message'],
        'role' => $row['role'] ?? null,
        'service' => $row['service'] ?? null,
        'blogPostId' => isset($row['blog_post_id']) ? (string) $row['blog_post_id'] : null,
        'blogTitle' => $row['blog_title'] ?? null,
        'conversionId' => $row['conversion_id'] ?? null,
        'utmSource' => $row['utm_source'],
        'utmMedium' => $row['utm_medium'],
        'utmCampaign' => $row['utm_campaign'],
        'pageUrl' => $row['page_url'],
        'status' => $row['status'],
        'notes' => $row['notes'] ?? '',
        'createdAt' => lead_time($row, 'created'),
        'updatedAt' => lead_time($row, 'updated'),
    ];
}

/**
 * The row's created_/updated_ time as UTC ISO 8601 ("2026-11-13T09:13:00Z"),
 * so the console can show it in Indian time whatever the database server's
 * time zone is. Needs UNIX_TIMESTAMP(...) AS <prefix>_ts in the SELECT.
 */
function lead_time(array $row, string $prefix): string
{
    $ts = $row[$prefix . '_ts'] ?? null;
    return $ts === null ? (string) $row[$prefix . '_at'] : gmdate('Y-m-d\TH:i:s\Z', (int) $ts);
}

/** Columns every lead SELECT needs (alias l). */
const LEAD_TIMES_SQL = 'UNIX_TIMESTAMP(l.created_at) AS created_ts, UNIX_TIMESTAMP(l.updated_at) AS updated_ts';

function lead_find(int $id): ?array
{
    $stmt = db()->prepare('SELECT l.*, ' . LEAD_TIMES_SQL . ' FROM campaign_leads l WHERE l.id = ? AND l.site_key = ?');
    $stmt->execute([$id, site_key()]);
    return $stmt->fetch() ?: null;
}
