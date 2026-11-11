<?php
/** GET api/blog/get.php?id=12 — one post with everything the editor needs. */

declare(strict_types=1);
require __DIR__ . '/../lib/bootstrap.php';
require __DIR__ . '/../lib/blog.php';

require_method('GET');
require_user();

$id = (int) ($_GET['id'] ?? 0);
$stmt = db()->prepare('SELECT * FROM blog_posts WHERE id = ? AND site_key = ?');
$stmt->execute([$id, site_key()]);
$row = $stmt->fetch();
if (!$row) {
    fail('Post not found.', 404);
}
ok(['post' => blog_admin_full($row)]);
