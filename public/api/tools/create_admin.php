<?php
/**
 * Creates (or resets the password of) an admin console user.
 * Run over SSH from the api/ folder's parent — never over HTTP:
 *
 *   php api/tools/create_admin.php you@medgrowth.co.in "Your Name" admin
 *
 * Role is "admin" (can publish) or "editor" (drafts + review only).
 * You'll be asked for the password; it is stored only as a hash.
 */

declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    http_response_code(404);
    exit;
}

// Same rule as lib/bootstrap.php: config.local.php (this computer) wins over config.php.
$GLOBALS['GC_CONFIG'] = require is_file(__DIR__ . '/../config.local.php') ? __DIR__ . '/../config.local.php' : __DIR__ . '/../config.php';
$cfg = $GLOBALS['GC_CONFIG']['db'];

[$script, $email, $name, $role] = array_pad($argv, 4, null);
$email = strtolower(trim((string) $email));
$role = $role ?: 'admin';
if (!filter_var($email, FILTER_VALIDATE_EMAIL) || !$name || !in_array($role, ['admin', 'editor'], true)) {
    fwrite(STDERR, "Usage: php api/tools/create_admin.php EMAIL \"FULL NAME\" [admin|editor]\n");
    exit(1);
}

fwrite(STDOUT, 'Password (min 12 characters): ');
if (DIRECTORY_SEPARATOR === '/') {
    shell_exec('stty -echo');
}
$password = trim((string) fgets(STDIN));
if (DIRECTORY_SEPARATOR === '/') {
    shell_exec('stty echo');
}
fwrite(STDOUT, "\n");
if (strlen($password) < 12) {
    fwrite(STDERR, "Password must be at least 12 characters.\n");
    exit(1);
}

$pdo = new PDO(sprintf('mysql:host=%s;port=%d;dbname=%s;charset=utf8mb4', $cfg['host'], $cfg['port'] ?? 3306, $cfg['name']), $cfg['user'], $cfg['pass'], [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
$pdo->prepare(
    'INSERT INTO admin_users (email, name, password_hash, role) VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE name = VALUES(name), password_hash = VALUES(password_hash), role = VALUES(role), is_active = 1, failed_logins = 0, locked_until = NULL'
)->execute([$email, $name, password_hash($password, PASSWORD_DEFAULT), $role]);

fwrite(STDOUT, "Saved $role user $email.\n");
