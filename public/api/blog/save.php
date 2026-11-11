<?php
/**
 * POST api/blog/save.php — create (no id) or update (with id) a post.
 *
 * Body: { id?, slug, title, category, excerpt, intro[], sections[{ id?, heading,
 *         paragraphs[], image?, youtubeId? }], tags[], images[], youtubeId?,
 *         conversionId?, author?, status, publishedAt, readMins, wordCount, seoScore }
 *
 * Sub topics are replaced wholesale on every save — the editor always sends
 * the full list, so that one rule covers adding, removing and reordering.
 */

declare(strict_types=1);
require __DIR__ . '/../lib/bootstrap.php';
require __DIR__ . '/../lib/blog.php';

require_method('POST');
$user = require_user();
$in = read_json();
$data = blog_validate($in, $user);
$post = $data['post'];
$id = isset($in['id']) && $in['id'] !== '' && $in['id'] !== null ? (int) $in['id'] : null;
$site = site_key();
$pdo = db();

if ($id !== null) {
    $existing = $pdo->prepare('SELECT * FROM blog_posts WHERE id = ? AND site_key = ?');
    $existing->execute([$id, $site]);
    $existing = $existing->fetch();
    if (!$existing) {
        fail('Post not found — it may have been deleted.', 404);
    }
    // Editors can't change a post an admin has already published.
    if ($user['role'] !== 'admin' && in_array($existing['status'], ['published', 'scheduled'], true)) {
        fail('This post is already published. Ask an admin to change it.', 403);
    }
}

$clash = $pdo->prepare('SELECT id FROM blog_posts WHERE site_key = ? AND slug = ? AND id <> ?');
$clash->execute([$site, $post['slug'], $id ?? 0]);
if ($clash->fetch()) {
    fail('Another post already uses this URL. Change the slug.', 409, ['field' => 'slug']);
}

$columns = [
    'slug' => $post['slug'],
    'title' => $post['title'],
    'category' => $post['category'],
    'excerpt' => $post['excerpt'],
    'intro' => json_encode($post['intro'], JSON_UNESCAPED_UNICODE),
    'tags' => json_encode($post['tags'], JSON_UNESCAPED_UNICODE),
    'images' => json_encode($post['images'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES),
    'youtube_id' => $post['youtube_id'],
    'conversion_id' => $post['conversion_id'],
    'author' => $post['author'],
    'status' => $post['status'],
    'published_at' => $post['published_at'],
    'read_mins' => $post['read_mins'],
    'word_count' => $post['word_count'],
    'seo_score' => $post['seo_score'],
    'updated_by' => $user['id'],
];

$pdo->beginTransaction();
try {
    if ($id === null) {
        $columns['site_key'] = $site;
        $columns['created_by'] = $user['id'];
        $names = array_keys($columns);
        $pdo->prepare('INSERT INTO blog_posts (' . implode(', ', $names) . ') VALUES (' . implode(', ', array_fill(0, count($names), '?')) . ')')
            ->execute(array_values($columns));
        $id = (int) $pdo->lastInsertId();
    } else {
        $set = implode(', ', array_map(fn ($c) => "$c = ?", array_keys($columns)));
        $pdo->prepare("UPDATE blog_posts SET $set WHERE id = ? AND site_key = ?")
            ->execute([...array_values($columns), $id, $site]);
    }

    $pdo->prepare('DELETE FROM blog_sections WHERE post_id = ?')->execute([$id]);
    $insert = $pdo->prepare('INSERT INTO blog_sections (post_id, section_key, position, heading, paragraphs, image, youtube_id) VALUES (?, ?, ?, ?, ?, ?, ?)');
    foreach ($data['sections'] as $i => $s) {
        $insert->execute([$id, $s['section_key'], $i, $s['heading'], json_encode($s['paragraphs'], JSON_UNESCAPED_UNICODE), $s['image'], $s['youtube_id']]);
    }
    $pdo->commit();
} catch (Throwable $e) {
    $pdo->rollBack();
    throw $e;
}

audit($user['id'], 'post_saved', 'post', $id, ['status' => $post['status'], 'slug' => $post['slug']]);

$row = $pdo->prepare('SELECT * FROM blog_posts WHERE id = ?');
$row->execute([$id]);
ok(['post' => blog_admin_full($row->fetch())]);
