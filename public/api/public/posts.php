<?php
/**
 * GET api/public/posts.php — published posts for the website's blog list.
 * No login. Read-only. Browser access allowed only from `public_origins`.
 * Returns the website's BlogPost shape without sections (lighter for lists).
 */

declare(strict_types=1);
require __DIR__ . '/../lib/bootstrap.php';
require __DIR__ . '/../lib/blog.php';

public_cors();
require_method('GET');

$stmt = db()->prepare(
    "SELECT * FROM blog_posts
     WHERE site_key = ? AND (status = 'published' OR (status = 'scheduled' AND published_at <= CURDATE()))
     ORDER BY published_at DESC, id DESC"
);
$stmt->execute([blog_site()]);

header('Cache-Control: public, max-age=300');
ok(['posts' => array_map(fn ($r) => blog_public($r, false), $stmt->fetchAll())]);
