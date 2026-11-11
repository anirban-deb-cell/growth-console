<?php
/**
 * Blog helpers: input validation and the mapping between database rows and
 * the two JSON shapes the API returns —
 *   - admin shape  (console: list + editor), and
 *   - public shape (website: identical to the BlogPost interface in
 *     medgrowth-ui/src/app/pages/blog/blog-posts.data.ts).
 */

declare(strict_types=1);
require_once __DIR__ . '/input.php';

const BLOG_STATUSES = ['draft', 'in_review', 'scheduled', 'published'];
/** Statuses an editor (not admin) may save — publishing needs an admin. */
const BLOG_EDITOR_STATUSES = ['draft', 'in_review'];

/**
 * Validates and normalises a save request from the editor.
 * Returns ['post' => [...columns], 'sections' => [[...], ...]].
 */
function blog_validate(array $in, array $user): array
{
    $slug = input_str($in, 'slug', 160, true, 'URL slug');
    if (!preg_match('/^[a-z0-9]+(-[a-z0-9]+)*$/', $slug)) {
        fail('The URL slug may only use lowercase letters, numbers and hyphens.', 422, ['field' => 'slug']);
    }

    $status = (string) ($in['status'] ?? 'draft');
    if (!in_array($status, BLOG_STATUSES, true)) {
        fail('Unknown status.', 422, ['field' => 'status']);
    }
    if ($user['role'] !== 'admin' && !in_array($status, BLOG_EDITOR_STATUSES, true)) {
        fail('Only an admin can publish or schedule posts. Send it for review instead.', 403);
    }

    $publishedAt = (string) ($in['publishedAt'] ?? '');
    $date = DateTimeImmutable::createFromFormat('!Y-m-d', $publishedAt);
    if (!$date || $date->format('Y-m-d') !== $publishedAt) {
        fail('Published date must be a valid date (YYYY-MM-DD).', 422, ['field' => 'publishedAt']);
    }
    // A "published" post dated in the future is really scheduled.
    if ($status === 'published' && $publishedAt > date('Y-m-d')) {
        $status = 'scheduled';
    }

    $conversion = input_str($in, 'conversionId', 120);
    if ($conversion !== null && !preg_match('#^AW-\d+/[A-Za-z0-9_-]+$#', $conversion)) {
        fail('Google Ads conversion ID should look like AW-123456789/label.', 422, ['field' => 'conversionId']);
    }

    $images = [];
    foreach (input_list($in['images'] ?? [], 20, 500, 'Photos') as $img) {
        $images[] = input_image($img);
    }

    $sections = [];
    $rawSections = $in['sections'] ?? [];
    if (!is_array($rawSections) || count($rawSections) > 50) {
        fail('Sub topics must be a list of at most 50 items.', 422);
    }
    $usedKeys = [];
    foreach (array_values($rawSections) as $i => $s) {
        if (!is_array($s)) {
            fail('Each sub topic must be an object.', 422);
        }
        $heading = input_str($s, 'heading', 255);
        if ($heading === null) {
            continue; // the editor allows empty sub topic cards; they're not saved
        }
        $key = slugify((string) ($s['id'] ?? '')) ?: slugify($heading) ?: 'section-' . ($i + 1);
        // Anchor ids must be unique within a post or the table of contents breaks.
        $base = $key;
        for ($n = 2; isset($usedKeys[$key]); $n++) {
            $key = "$base-$n";
        }
        $usedKeys[$key] = true;
        $sections[] = [
            'section_key' => mb_substr($key, 0, 160),
            'heading' => $heading,
            'paragraphs' => input_list($s['paragraphs'] ?? [], 100, 20000, 'Sub topic text'),
            'image' => input_image(isset($s['image']) ? trim((string) $s['image']) : null),
            'youtube_id' => input_youtube(isset($s['youtubeId']) ? trim((string) $s['youtubeId']) : null),
        ];
    }

    return [
        'post' => [
            'slug' => $slug,
            'title' => input_str($in, 'title', 255, true, 'Title'),
            'category' => input_str($in, 'category', 120, true, 'Category'),
            'excerpt' => input_str($in, 'excerpt', 1000, true, 'Description'),
            'intro' => input_list($in['intro'] ?? [], 50, 20000, 'Intro'),
            'tags' => array_values(array_unique(input_list($in['tags'] ?? [], 30, 60, 'Tags'))),
            'images' => $images,
            'youtube_id' => input_youtube(isset($in['youtubeId']) ? trim((string) $in['youtubeId']) : null),
            'conversion_id' => $conversion,
            'author' => input_str($in, 'author', 160),
            'status' => $status,
            'published_at' => $publishedAt,
            'read_mins' => max(1, min(600, (int) ($in['readMins'] ?? 1))),
            'word_count' => max(0, min(1000000, (int) ($in['wordCount'] ?? 0))),
            'seo_score' => max(0, min(100, (int) ($in['seoScore'] ?? 0))),
        ],
        'sections' => $sections,
    ];
}

/** Scheduled posts whose date has arrived count as live — no cron job needed. */
function blog_effective_status(array $row): string
{
    if ($row['status'] === 'scheduled' && $row['published_at'] <= date('Y-m-d')) {
        return 'published';
    }
    return $row['status'];
}

/** Summary used by the console's "All posts" table. */
function blog_admin_summary(array $row, bool $sectionVideo = false): array
{
    return [
        'id' => (string) $row['id'],
        'slug' => $row['slug'],
        'title' => $row['title'],
        'category' => $row['category'],
        'excerpt' => $row['excerpt'],
        'tags' => json_list($row['tags']),
        'status' => blog_effective_status($row),
        'date' => $row['published_at'],
        'author' => $row['author'] ?? '',
        'seoScore' => (int) $row['seo_score'],
        'wordCount' => (int) $row['word_count'],
        'hasConversion' => !empty($row['conversion_id']),
        'hasVideo' => !empty($row['youtube_id']) || $sectionVideo,
        'conversionId' => $row['conversion_id'] ?: null,
        'updatedAt' => $row['updated_at'],
        'url' => rtrim((string) cfg('site_url'), '/') . '/blog/' . $row['slug'],
    ];
}

function blog_load_sections(int $postId): array
{
    $stmt = db()->prepare('SELECT section_key, heading, paragraphs, image, youtube_id FROM blog_sections WHERE post_id = ? ORDER BY position, id');
    $stmt->execute([$postId]);
    return $stmt->fetchAll();
}

/** Everything the editor needs to reopen a post. */
function blog_admin_full(array $row): array
{
    $sections = blog_load_sections((int) $row['id']);
    $hasSectionVideo = (bool) array_filter($sections, fn ($s) => !empty($s['youtube_id']));
    return blog_admin_summary($row, $hasSectionVideo) + [
        'intro' => json_list($row['intro']),
        'images' => json_list($row['images']),
        'youtubeId' => $row['youtube_id'] ?: null,
        'readMins' => (int) $row['read_mins'],
        'sections' => array_map(fn ($s) => [
            'id' => $s['section_key'],
            'heading' => $s['heading'],
            'paragraphs' => json_list($s['paragraphs']),
            'image' => $s['image'] ?: null,
            'youtubeId' => $s['youtube_id'] ?: null,
        ], $sections),
    ];
}

/** The website's BlogPost shape (see blog-posts.data.ts), plus `images`. */
function blog_public(array $row, bool $withSections = true): array
{
    $images = json_list($row['images']);
    $post = [
        'slug' => $row['slug'],
        'title' => $row['title'],
        'category' => $row['category'],
        'excerpt' => $row['excerpt'],
        'intro' => json_list($row['intro']),
        'tags' => json_list($row['tags']),
        'photoCount' => count($images),
        'images' => $images,
        'publishedAt' => $row['published_at'],
        'updatedAt' => substr((string) $row['updated_at'], 0, 10),
        'readMins' => (int) $row['read_mins'],
        'author' => $row['author'] ?: null,
    ];
    if ($images) {
        $post['coverImage'] = $images[0];
    }
    if (!empty($row['youtube_id'])) {
        $post['youtubeId'] = $row['youtube_id'];
    }
    if (!empty($row['conversion_id'])) {
        $post['conversionId'] = $row['conversion_id'];
    }
    if ($withSections) {
        $post['sections'] = array_map(function (array $s): array {
            $section = ['id' => $s['section_key'], 'heading' => $s['heading'], 'paragraphs' => json_list($s['paragraphs'])];
            if (!empty($s['image'])) {
                $section['image'] = $s['image'];
                $section['photoCount'] = 1;
            }
            if (!empty($s['youtube_id'])) {
                $section['youtubeId'] = $s['youtube_id'];
            }
            return $section;
        }, blog_load_sections((int) $row['id']));
    }
    return $post;
}

/** CORS for the public endpoints only — admin endpoints stay same-origin. */
function public_cors(): void
{
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    if ($origin !== '' && in_array($origin, (array) cfg('public_origins', []), true)) {
        header('Access-Control-Allow-Origin: ' . $origin);
        header('Vary: Origin');
        header('Access-Control-Allow-Methods: GET, OPTIONS');
    }
    if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
        http_response_code(204);
        exit;
    }
}
