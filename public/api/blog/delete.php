<?php
/**
 * POST api/blog/delete.php   { "id": 12 }
 * Admins can delete any post; editors only drafts and posts in review.
 * Uploaded images are kept (another post may use them) — see blog_uploads.
 */

declare(strict_types=1);
require __DIR__ . '/../lib/bootstrap.php';
require __DIR__ . '/../lib/blog.php';

require_method('POST');
$user = require_user();
$id = (int) (read_json()['id'] ?? 0);

$stmt = db()->prepare('SELECT id, slug, title, status FROM blog_posts WHERE id = ? AND site_key = ?');
$stmt->execute([$id, site_key()]);
$post = $stmt->fetch();
if (!$post) {
    fail('Post not found.', 404);
}
if ($user['role'] !== 'admin' && !in_array($post['status'], BLOG_EDITOR_STATUSES, true)) {
    fail('Only an admin can delete a published or scheduled post.', 403);
}

db()->prepare('DELETE FROM blog_posts WHERE id = ?')->execute([$id]); // sections go with it (ON DELETE CASCADE)
audit($user['id'], 'post_deleted', 'post', $id, ['slug' => $post['slug'], 'title' => $post['title'], 'status' => $post['status']]);
ok();
