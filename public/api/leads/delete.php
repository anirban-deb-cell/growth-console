<?php
/**
 * POST api/leads/delete.php   { "id": 7 }
 * Permanently removes an enquiry and its personal details — for spam, or
 * when someone asks for their data to be deleted. Admin only.
 */

declare(strict_types=1);
require __DIR__ . '/../lib/bootstrap.php';
require __DIR__ . '/../lib/leads.php';

require_method('POST');
$user = require_user('admin');
$row = lead_find((int) (read_json()['id'] ?? 0));
if (!$row) {
    fail('Enquiry not found.', 404);
}
db()->prepare('DELETE FROM campaign_leads WHERE id = ?')->execute([(int) $row['id']]);
// The audit entry deliberately records no personal details.
audit($user['id'], 'lead_deleted', 'lead', (int) $row['id'], ['campaign_id' => $row['campaign_id'], 'channel' => $row['channel']]);
ok();
