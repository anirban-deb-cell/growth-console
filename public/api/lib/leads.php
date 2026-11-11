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
        'createdAt' => $row['created_at'],
        'updatedAt' => $row['updated_at'],
    ];
}

function lead_find(int $id): ?array
{
    $stmt = db()->prepare('SELECT * FROM campaign_leads WHERE id = ? AND site_key = ?');
    $stmt->execute([$id, site_key()]);
    return $stmt->fetch() ?: null;
}
