<?php
/** GET api/auth/me.php — the signed-in user, or 401. The console calls this on load. */

declare(strict_types=1);
require __DIR__ . '/../lib/bootstrap.php';

require_method('GET');
ok(['user' => require_user()]);
