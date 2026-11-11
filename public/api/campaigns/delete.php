<?php
/**
 * POST api/campaigns/delete.php   { "id": 12 }
 * Admins can delete any campaign that isn't running; editors only drafts and
 * campaigns waiting for approval. A live campaign must be ended first, so its
 * history isn't lost by accident. Uploaded images and the campaign's
 * enquiries are kept.
 */

declare(strict_types=1);
require __DIR__ . '/../lib/bootstrap.php';
require __DIR__ . '/../lib/campaigns.php';

require_method('POST');
$user = require_user();
$row = campaign_find((int) (read_json()['id'] ?? 0));
if (!$row) {
    fail('Campaign not found.', 404);
}
if (in_array($row['status'], ['active', 'paused'], true)) {
    fail('This campaign is live. End it first, then delete it.', 409);
}
if ($user['role'] !== 'admin' && !in_array($row['status'], CAMPAIGN_EDITOR_STATUSES, true)) {
    fail('Only an admin can delete this campaign.', 403);
}

// Its enquiries are kept (campaign_id becomes NULL) and remember the campaign's name.
db()->prepare('UPDATE campaign_leads SET campaign_name = ? WHERE campaign_id = ?')->execute([$row['name'], (int) $row['id']]);
db()->prepare('DELETE FROM campaigns WHERE id = ?')->execute([(int) $row['id']]);
audit($user['id'], 'campaign_deleted', 'campaign', (int) $row['id'], ['name' => $row['name'], 'status' => $row['status']]);
ok();
