<?php
/** GET api/campaigns/get.php?id=12 — one campaign with everything the editor needs. */

declare(strict_types=1);
require __DIR__ . '/../lib/bootstrap.php';
require __DIR__ . '/../lib/campaigns.php';

require_method('GET');
require_user();

$row = campaign_find((int) ($_GET['id'] ?? 0));
if (!$row) {
    fail('Campaign not found.', 404);
}
ok(['campaign' => campaign_admin($row)]);
