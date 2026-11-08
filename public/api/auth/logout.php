<?php
/** POST api/auth/logout.php — ends the admin session. */

declare(strict_types=1);
require __DIR__ . '/../lib/bootstrap.php';

require_method('POST');
$user = current_user();
if ($user) {
    audit($user['id'], 'logout', 'user', $user['id']);
}
start_session();
$_SESSION = [];
$params = session_get_cookie_params();
setcookie(session_name(), '', ['expires' => time() - 3600, 'path' => $params['path'], 'secure' => $params['secure'], 'httponly' => true, 'samesite' => 'Strict']);
session_destroy();
ok();
