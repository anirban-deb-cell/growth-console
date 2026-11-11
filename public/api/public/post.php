<?php
/**
 * GET api/public/post.php?slug=local-seo-wins-patients — one published post
 * with its sections, in the website's BlogPost shape. Drafts, posts in
 * review and future-scheduled posts return 404.
 */

declare(strict_types=1);
require __DIR__ . '/../lib/bootstrap.php';
require __DIR__ . '/../lib/blog.php';

public_cors();
require_method('GET');

$slug = (string) ($_GET['slug'] ?? '');
if (!preg_match('/^[a-z0-9]+(-[a-z0-9]+)*$/', $slug)) {
    fail('Post not found.', 404);
}

$stmt = db()->prepare(
    "SELECT * FROM blog_posts
     WHERE site_key = ? AND slug = ? AND (status = 'published' OR (status = 'scheduled' AND published_at <= CURDATE()))"
);
$stmt->execute([site_key(), $slug]);
$row = $stmt->fetch();
if (!$row) {
    fail('Post not found.', 404);
}

header('Cache-Control: public, max-age=300');
ok(['post' => blog_public($row)]);
