<?php
/**
 * POST api/leads/update.php   { "id": 7, "status"?: "contacted", "notes"?: "Called, wants a proposal" }
 * Moves an enquiry along the pipeline and/or saves the team's notes.
 */

declare(strict_types=1);
require __DIR__ . '/../lib/bootstrap.php';
require __DIR__ . '/../lib/leads.php';

require_method('POST');
$user = require_user();
$in = read_json();
$row = lead_find((int) ($in['id'] ?? 0));
if (!$row) {
    fail('Enquiry not found.', 404);
}

$status = array_key_exists('status', $in) ? (string) $in['status'] : $row['status'];
if (!in_array($status, LEAD_STATUSES, true)) {
    fail('Unknown status.', 422, ['field' => 'status']);
}
$notes = array_key_exists('notes', $in) ? input_str($in, 'notes', 5000) : $row['notes'];

db()->prepare('UPDATE campaign_leads SET status = ?, notes = ?, updated_by = ? WHERE id = ?')
    ->execute([$status, $notes, $user['id'], (int) $row['id']]);
if ($status !== $row['status']) {
    audit($user['id'], 'lead_status', 'lead', (int) $row['id'], ['from' => $row['status'], 'to' => $status]);
}
ok(['lead' => lead_admin(lead_find((int) $row['id']))]);
