<?php
/**
 * POST api/campaigns/save.php — create (no id) or update (with id) a campaign.
 *
 * Body: the Campaign shape from the console (see lib/campaigns.php →
 * campaign_validate for every field). New campaigns are saved as "draft" or
 * "in_review" (sent for client approval); launching, pausing and ending are
 * done afterwards with status.php.
 */

declare(strict_types=1);
require __DIR__ . '/../lib/bootstrap.php';
require __DIR__ . '/../lib/campaigns.php';

require_method('POST');
$user = require_user();
$in = read_json();
$id = isset($in['id']) && $in['id'] !== '' && $in['id'] !== null ? (int) $in['id'] : null;
$site = site_key();
$pdo = db();

$existing = null;
if ($id !== null) {
    $existing = campaign_find($id);
    if (!$existing) {
        fail('Campaign not found — it may have been deleted.', 404);
    }
    // Editors can't change a campaign an admin has already launched.
    if ($user['role'] !== 'admin' && !in_array($existing['status'], CAMPAIGN_EDITOR_STATUSES, true)) {
        fail('This campaign is already live. Ask an admin to change it.', 403);
    }
    if ($existing['status'] === 'ended') {
        fail('This campaign has ended and can’t be changed. Create a new one instead.', 409);
    }
    // Refuse a save made from an out-of-date screen, so it can't silently undo
    // changes made since it was opened (in another tab, by a colleague, or by an import).
    $expected = (string) ($in['expectedUpdatedAt'] ?? '');
    if ($expected !== '' && $expected !== (string) $existing['updated_at']) {
        fail('This campaign was changed after you opened it. Reload the page to get the latest version, then make your changes again.', 409);
    }
}

$columns = campaign_validate($in, $user, $existing);

if ($columns['slug'] !== null) {
    $clash = $pdo->prepare('SELECT id FROM campaigns WHERE site_key = ? AND slug = ? AND id <> ?');
    $clash->execute([$site, $columns['slug'], $id ?? 0]);
    if ($clash->fetch()) {
        fail('Another campaign already uses this landing page URL. Change it.', 409, ['field' => 'slug']);
    }
}

$columns['updated_by'] = $user['id'];
if ($id === null) {
    $columns['site_key'] = $site;
    $columns['created_by'] = $user['id'];
    $names = array_keys($columns);
    $pdo->prepare('INSERT INTO campaigns (' . implode(', ', $names) . ') VALUES (' . implode(', ', array_fill(0, count($names), '?')) . ')')
        ->execute(array_values($columns));
    $id = (int) $pdo->lastInsertId();
} else {
    $set = implode(', ', array_map(fn ($c) => "$c = ?", array_keys($columns)));
    $pdo->prepare("UPDATE campaigns SET $set WHERE id = ? AND site_key = ?")
        ->execute([...array_values($columns), $id, $site]);
}

audit($user['id'], 'campaign_saved', 'campaign', $id, ['status' => $columns['status'], 'name' => $columns['name']]);
ok(['campaign' => campaign_admin(campaign_find($id))]);
