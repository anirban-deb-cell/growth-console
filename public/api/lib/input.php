<?php
/**
 * Input helpers shared by every module (blog, campaigns): validated strings
 * and lists, safe image/video references, slugs and JSON columns. Each one
 * stops the request with a 422 and a readable message on bad input.
 */

declare(strict_types=1);

/** Which website this console writes to (blog_posts.site_key, campaigns.site_key). */
function site_key(): string
{
    return (string) cfg('site_key', 'medgrowth');
}

function input_str(array $in, string $key, int $max, bool $required = false, string $label = ''): ?string
{
    $value = isset($in[$key]) ? trim((string) $in[$key]) : '';
    if ($value === '') {
        if ($required) {
            fail(($label ?: $key) . ' is required.', 422, ['field' => $key]);
        }
        return null;
    }
    if (mb_strlen($value) > $max) {
        fail(($label ?: $key) . " is too long (max $max characters).", 422, ['field' => $key]);
    }
    return $value;
}

/** A list of non-empty strings, each trimmed and length-capped. */
function input_list(mixed $value, int $maxItems, int $maxLen, string $label): array
{
    if ($value === null) {
        return [];
    }
    if (!is_array($value)) {
        fail("$label must be a list.", 422);
    }
    $out = [];
    foreach ($value as $item) {
        $item = trim((string) $item);
        if ($item === '') {
            continue;
        }
        if (mb_strlen($item) > $maxLen) {
            fail("An item in $label is too long (max $maxLen characters).", 422);
        }
        $out[] = $item;
    }
    if (count($out) > $maxItems) {
        fail("$label can have at most $maxItems items.", 422);
    }
    return $out;
}

function input_youtube(?string $id): ?string
{
    if ($id === null || $id === '') {
        return null;
    }
    if (!preg_match('/^[A-Za-z0-9_-]{11}$/', $id)) {
        fail('That YouTube video ID doesn’t look right.', 422);
    }
    return $id;
}

/** Image references must be http(s) URLs or site-relative paths — never javascript:, data: etc. */
function input_image(?string $url): ?string
{
    if ($url === null || $url === '') {
        return null;
    }
    if (mb_strlen($url) > 500 || !preg_match('#^(https?://[^\s"<>]+|/[^\s"<>]*)$#i', $url)) {
        fail('An image link is not a valid URL or path.', 422);
    }
    return $url;
}

function slugify(string $value): string
{
    $slug = strtolower(trim($value));
    $slug = preg_replace('/[^a-z0-9]+/', '-', $slug) ?? '';
    return trim($slug, '-');
}

/** Decodes a JSON list column; anything unreadable becomes []. */
function json_list(?string $value): array
{
    $decoded = json_decode($value ?? '[]', true);
    return is_array($decoded) ? $decoded : [];
}
