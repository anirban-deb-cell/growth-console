<?php
/**
 * Shared bootstrap for every API endpoint: config, JSON responses, errors,
 * database, session login and the audit log.
 *
 * Endpoints are plain PHP files (no framework) so they run on any Hostinger
 * plan. Each one starts with `require __DIR__ . '/../lib/bootstrap.php';`.
 */

declare(strict_types=1);

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

// config.local.php (your computer only — never committed or deployed) wins
// over config.php (the server's settings), so one checkout can hold both.
$GC_CONFIG_FILE = is_file(__DIR__ . '/../config.local.php') ? __DIR__ . '/../config.local.php' : __DIR__ . '/../config.php';
if (!is_file($GC_CONFIG_FILE)) {
    http_response_code(500);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['ok' => false, 'message' => 'API not configured: copy api/config.example.php to api/config.php.']);
    exit;
}
$GLOBALS['GC_CONFIG'] = require $GC_CONFIG_FILE;

/** Reads a config value by dotted path, e.g. cfg('db.host'). */
function cfg(string $path, mixed $default = null): mixed
{
    $value = $GLOBALS['GC_CONFIG'];
    foreach (explode('.', $path) as $key) {
        if (!is_array($value) || !array_key_exists($key, $value)) {
            return $default;
        }
        $value = $value[$key];
    }
    return $value;
}

function is_dev(): bool
{
    return cfg('env') === 'development';
}

// ---------------------------------------------------------------------------
// Responses & errors
// ---------------------------------------------------------------------------

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
// Never let a browser or the Hostinger CDN cache an API answer (sign-in state,
// user data). The public read-only endpoints override this with their own header.
header('Cache-Control: no-store, private');

/** Thrown for expected failures; turned into a JSON error with its status code. */
final class ApiError extends RuntimeException
{
    public function __construct(string $message, public readonly int $status = 400, public readonly array $extra = [])
    {
        parent::__construct($message);
    }
}

function json_out(array $data, int $status = 200): never
{
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function ok(array $data = []): never
{
    json_out(['ok' => true] + $data);
}

function fail(string $message, int $status = 400, array $extra = []): never
{
    throw new ApiError($message, $status, $extra);
}

set_exception_handler(function (Throwable $e): void {
    if ($e instanceof ApiError) {
        json_out(['ok' => false, 'message' => $e->getMessage()] + $e->extra, $e->status);
    }
    error_log('[growth-console] ' . $e::class . ': ' . $e->getMessage() . ' @ ' . $e->getFile() . ':' . $e->getLine());
    json_out(['ok' => false, 'message' => is_dev() ? $e->getMessage() : (setup_hint($e) ?? 'Something went wrong. Please try again.')], 500);
});

/**
 * For the usual first-deploy mistakes, a hint that says what to fix without
 * revealing any detail (no host names, users or SQL) — the full error is in
 * the PHP error log.
 */
function setup_hint(Throwable $e): ?string
{
    if (!$e instanceof PDOException) {
        return null;
    }
    $m = $e->getMessage();
    return match (true) {
        str_contains($m, '[1045]') => 'Server setup: the database rejected the login. Check db.user and db.pass in api/config.php (and that the user is added to the database in hPanel).',
        str_contains($m, '[1044]') => 'Server setup: the database user has no access to this database. Add the user to the database in hPanel → MySQL Databases.',
        str_contains($m, '[1049]') => 'Server setup: database not found. Check db.name in api/config.php.',
        str_contains($m, '[2002]'), str_contains($m, '[2005]') => 'Server setup: can’t reach the database server. Check db.host in api/config.php (usually "localhost" on Hostinger).',
        str_contains($m, '42S02') => 'Server setup: database tables are missing. Import database/blog_schema.sql, then database/campaign_schema.sql, in phpMyAdmin.',
        str_contains($m, '42S22') => 'Server setup: the database tables are out of date. Re-import the files in database/.',
        default => 'Server setup: a database error occurred. See the PHP error log for details.',
    };
}

// ---------------------------------------------------------------------------
// Request helpers
// ---------------------------------------------------------------------------

function require_method(string ...$methods): void
{
    if (!in_array($_SERVER['REQUEST_METHOD'] ?? 'GET', $methods, true)) {
        header('Allow: ' . implode(', ', $methods));
        fail('Method not allowed.', 405);
    }
}

/** Decodes a JSON request body (max 2 MB). */
function read_json(): array
{
    $raw = file_get_contents('php://input', false, null, 0, 2 * 1024 * 1024 + 1);
    if ($raw === false || strlen($raw) > 2 * 1024 * 1024) {
        fail('Request body is too large.', 413);
    }
    $data = json_decode($raw ?: '[]', true);
    if (!is_array($data)) {
        fail('Request body must be JSON.', 422);
    }
    return $data;
}

function client_ip(): string
{
    return substr((string) ($_SERVER['REMOTE_ADDR'] ?? ''), 0, 45);
}

// ---------------------------------------------------------------------------
// Database
// ---------------------------------------------------------------------------

function db(): PDO
{
    static $pdo = null;
    if ($pdo === null) {
        $dsn = sprintf('mysql:host=%s;port=%d;dbname=%s;charset=utf8mb4', cfg('db.host'), (int) cfg('db.port', 3306), cfg('db.name'));
        $pdo = new PDO($dsn, (string) cfg('db.user'), (string) cfg('db.pass'), [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]);
    }
    return $pdo;
}

function audit(?int $userId, string $action, ?string $entity = null, string|int|null $entityId = null, ?array $details = null): void
{
    try {
        db()->prepare('INSERT INTO audit_log (user_id, action, entity, entity_id, details, ip) VALUES (?, ?, ?, ?, ?, ?)')
            ->execute([$userId, $action, $entity, $entityId === null ? null : (string) $entityId, $details === null ? null : json_encode($details, JSON_UNESCAPED_UNICODE), client_ip()]);
    } catch (Throwable $e) {
        // The audit trail must never break the action it records.
        error_log('[growth-console] audit failed: ' . $e->getMessage());
    }
}

// ---------------------------------------------------------------------------
// Session login
// ---------------------------------------------------------------------------

function start_session(): void
{
    if (session_status() === PHP_SESSION_ACTIVE) {
        return;
    }
    $https = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') || (($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '') === 'https');
    session_name((string) cfg('session.name', 'gc_session'));
    session_set_cookie_params([
        'lifetime' => 0,
        'path' => '/',
        'secure' => $https,
        'httponly' => true,
        // Strict: the cookie is never sent on requests started by another site.
        'samesite' => 'Strict',
    ]);
    ini_set('session.use_strict_mode', '1');
    session_start();

    $idle = (int) cfg('session.idle_timeout', 14400);
    if (isset($_SESSION['last_seen']) && time() - (int) $_SESSION['last_seen'] > $idle) {
        $_SESSION = [];
        session_regenerate_id(true);
    }
    $_SESSION['last_seen'] = time();
}

/** The signed-in admin user, re-read from the database on every request. */
function current_user(): ?array
{
    start_session();
    $id = $_SESSION['user_id'] ?? null;
    if (!$id) {
        return null;
    }
    $stmt = db()->prepare('SELECT id, email, name, role, is_active FROM admin_users WHERE id = ?');
    $stmt->execute([$id]);
    $user = $stmt->fetch();
    if (!$user || !(int) $user['is_active']) {
        $_SESSION = [];
        return null;
    }
    return ['id' => (int) $user['id'], 'email' => $user['email'], 'name' => $user['name'], 'role' => $user['role']];
}

/**
 * Requires a signed-in user. For anything that changes data, it also
 * requires the X-Requested-With header the console sends: browsers won't
 * let another site add that header without a CORS preflight this API never
 * approves, which together with the SameSite=Strict cookie blocks CSRF.
 */
function require_user(string $role = 'editor'): array
{
    $method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
    if ($method !== 'GET' && ($_SERVER['HTTP_X_REQUESTED_WITH'] ?? '') !== 'XMLHttpRequest') {
        fail('Missing request header.', 403);
    }
    $user = current_user();
    if (!$user) {
        fail('Please sign in.', 401);
    }
    if ($role === 'admin' && $user['role'] !== 'admin') {
        fail('Only an admin can do this.', 403);
    }
    // Admin responses carry user data — never cache them.
    header('Cache-Control: no-store');
    return $user;
}
