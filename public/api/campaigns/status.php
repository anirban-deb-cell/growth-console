<?php
/**
 * POST api/campaigns/status.php   { "id": 12, "status": "active" }
 * Launch (approve), pause, resume, end, or send back to draft. Admin only.
 * Allowed changes are in CAMPAIGN_TRANSITIONS (lib/campaigns.php).
 *
 * Today this records the decision in the console; once the Google / Meta
 * Ads APIs are connected, the same step will also switch the live ads.
 */

declare(strict_types=1);
require __DIR__ . '/../lib/bootstrap.php';
require __DIR__ . '/../lib/campaigns.php';

require_method('POST');
$user = require_user('admin');
$in = read_json();
$row = campaign_find((int) ($in['id'] ?? 0));
if (!$row) {
    fail('Campaign not found.', 404);
}

$to = (string) ($in['status'] ?? '');
$from = $row['status'];
if (!in_array($to, CAMPAIGN_TRANSITIONS[$from] ?? [], true)) {
    fail("A campaign that is “{$from}” can’t be changed to “{$to}”.", 409);
}
if ($to === 'active' && $row['compliance'] === 'needs_fix') {
    fail('Fix the flagged ad wording before launching this campaign.', 409);
}

db()->prepare('UPDATE campaigns SET status = ?, updated_by = ? WHERE id = ?')->execute([$to, $user['id'], (int) $row['id']]);
audit($user['id'], 'campaign_status', 'campaign', (int) $row['id'], ['from' => $from, 'to' => $to, 'name' => $row['name']]);
ok(['campaign' => campaign_admin(campaign_find((int) $row['id']))]);
