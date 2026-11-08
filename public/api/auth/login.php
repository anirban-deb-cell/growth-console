<?php
/**
 * POST api/auth/login.php   { "email": "...", "password": "..." }
 * Starts an admin session. Locks the account for a while after repeated
 * wrong passwords, and always answers "wrong email or password" so the
 * response never reveals which accounts exist.
 */

declare(strict_types=1);
require __DIR__ . '/../lib/bootstrap.php';

require_method('POST');
if (($_SERVER['HTTP_X_REQUESTED_WITH'] ?? '') !== 'XMLHttpRequest') {
    fail('Missing request header.', 403);
}

$in = read_json();
$email = strtolower(trim((string) ($in['email'] ?? '')));
$password = (string) ($in['password'] ?? '');
if ($email === '' || $password === '') {
    fail('Enter your email and password.', 422);
}

$stmt = db()->prepare('SELECT * FROM admin_users WHERE email = ?');
$stmt->execute([$email]);
$user = $stmt->fetch();

if ($user && $user['locked_until'] !== null && strtotime($user['locked_until']) > time()) {
    $minutes = (int) ceil((strtotime($user['locked_until']) - time()) / 60);
    fail("Too many attempts. Try again in $minutes minute" . ($minutes === 1 ? '' : 's') . '.', 429);
}

// Verify against a dummy hash when the user doesn't exist, so the response
// time doesn't reveal whether an email is registered.
$hash = $user['password_hash'] ?? '$2y$12$KWCiJ3eIcTYs3X6/xUhi1.l4eRZXYiNKS9xE1AzSCZBAmUfKgCZZe';
$valid = password_verify($password, $hash) && $user && (int) $user['is_active'] === 1;

if (!$valid) {
    if ($user) {
        $attempts = (int) $user['failed_logins'] + 1;
        $lock = $attempts >= (int) cfg('login.max_attempts', 5);
        db()->prepare('UPDATE admin_users SET failed_logins = ?, locked_until = ? WHERE id = ?')
            ->execute([$lock ? 0 : $attempts, $lock ? date('Y-m-d H:i:s', time() + 60 * (int) cfg('login.lock_minutes', 15)) : null, $user['id']]);
    }
    audit($user ? (int) $user['id'] : null, 'login_failed', 'user', null, ['email' => $email]);
    usleep(400000);
    fail('Wrong email or password.', 401);
}

if (password_needs_rehash($user['password_hash'], PASSWORD_DEFAULT)) {
    db()->prepare('UPDATE admin_users SET password_hash = ? WHERE id = ?')->execute([password_hash($password, PASSWORD_DEFAULT), $user['id']]);
}
db()->prepare('UPDATE admin_users SET failed_logins = 0, locked_until = NULL, last_login_at = NOW() WHERE id = ?')->execute([$user['id']]);

start_session();
session_regenerate_id(true); // new session id on login: blocks session fixation
$_SESSION['user_id'] = (int) $user['id'];
$_SESSION['last_seen'] = time();

audit((int) $user['id'], 'login', 'user', (int) $user['id']);
header('Cache-Control: no-store');
ok(['user' => ['id' => (int) $user['id'], 'email' => $user['email'], 'name' => $user['name'], 'role' => $user['role']]]);
