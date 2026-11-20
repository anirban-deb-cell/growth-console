<?php
/**
 * Image uploads for every module. Each image is decoded and re-encoded with
 * GD: that strips EXIF metadata (camera GPS location, device details —
 * important when photos are taken in a hospital) and anything hidden inside
 * the file, and caps its size for the web.
 */

declare(strict_types=1);
require_once __DIR__ . '/input.php';

/**
 * Stores the uploaded "file" field under uploads/<folder>/YYYY/MM/ and
 * records it in blog_uploads (the table holds every module's uploads).
 * Returns ['url' => ..., 'width' => .., 'height' => ..].
 */
function store_image_upload(array $user, string $folder): array
{
    if (!extension_loaded('gd')) {
        fail('Image uploads need the PHP GD extension. Enable it in hPanel → PHP configuration.', 500);
    }

    $file = $_FILES['file'] ?? null;
    if (!$file || !is_array($file) || ($file['error'] ?? UPLOAD_ERR_NO_FILE) !== UPLOAD_ERR_OK || !is_uploaded_file($file['tmp_name'])) {
        $code = is_array($file) ? (int) ($file['error'] ?? 0) : UPLOAD_ERR_NO_FILE;
        fail($code === UPLOAD_ERR_INI_SIZE || $code === UPLOAD_ERR_FORM_SIZE ? 'That image is too large.' : 'No image was received.', 422);
    }

    $maxBytes = (int) cfg('upload_max_bytes', 5 * 1024 * 1024);
    if ((int) $file['size'] > $maxBytes) {
        fail('That image is too large (max ' . round($maxBytes / 1048576) . ' MB).', 413);
    }

    // Trust the file's actual bytes, never its name or the browser's claimed type.
    $mime = (new finfo(FILEINFO_MIME_TYPE))->file($file['tmp_name']);
    $types = ['image/jpeg' => 'jpg', 'image/png' => 'png', 'image/webp' => 'webp'];
    if (!isset($types[$mime])) {
        fail('Only JPG, PNG or WebP images can be uploaded.', 415);
    }

    $info = @getimagesize($file['tmp_name']);
    if (!$info || $info[0] < 1 || $info[1] < 1) {
        fail('That file isn’t a readable image.', 422);
    }
    [$width, $height] = $info;
    if ($width * $height > 40_000_000) {
        fail('That image has too many pixels. Please resize it first.', 422);
    }

    $src = match ($mime) {
        'image/jpeg' => @imagecreatefromjpeg($file['tmp_name']),
        'image/png' => @imagecreatefrompng($file['tmp_name']),
        'image/webp' => @imagecreatefromwebp($file['tmp_name']),
    };
    if (!$src) {
        fail('That image couldn’t be processed. Try saving it again as JPG or PNG.', 422);
    }

    // Web-sized: nothing wider than 2400 px.
    $maxWidth = 2400;
    if ($width > $maxWidth) {
        $newHeight = (int) round($height * $maxWidth / $width);
        $resized = imagecreatetruecolor($maxWidth, $newHeight);
        imagealphablending($resized, false);
        imagesavealpha($resized, true);
        imagecopyresampled($resized, $src, 0, 0, 0, 0, $maxWidth, $newHeight, $width, $height);
        imagedestroy($src);
        $src = $resized;
        [$width, $height] = [$maxWidth, $newHeight];
    }

    $ext = $types[$mime];
    $relDir = $folder . '/' . date('Y/m');
    $root = rtrim((string) cfg('uploads_dir'), '/');
    $dir = $root . '/' . $relDir;
    if (!is_dir($dir) && !@mkdir($dir, 0755, true) && !is_dir($dir)) {
        error_log("[upload] cannot create $dir");
        fail(uploads_setup_hint($root), 500);
    }
    protect_uploads_dir($root);
    $name = bin2hex(random_bytes(12)) . '.' . $ext;
    $path = "$dir/$name";

    $saved = match ($ext) {
        'jpg' => imagejpeg($src, $path, 85),
        'png' => imagepng($src, $path, 7),
        'webp' => imagewebp($src, $path, 85),
    };
    imagedestroy($src);
    if (!$saved) {
        error_log("[upload] could not write $path");
        fail(uploads_setup_hint($root), 500);
    }

    $url = rtrim((string) cfg('uploads_url'), '/') . "/$relDir/$name";
    $originalName = mb_substr(basename((string) $file['name']), 0, 255);

    db()->prepare('INSERT INTO blog_uploads (site_key, url, path, original_name, mime, bytes, width, height, uploaded_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
        ->execute([site_key(), $url, "$relDir/$name", $originalName, $mime, (int) filesize($path), $width, $height, $user['id']]);
    audit($user['id'], 'upload', 'upload', (int) db()->lastInsertId(), ['url' => $url]);

    return ['url' => $url, 'width' => $width, 'height' => $height];
}

/**
 * Writes the uploads folder's .htaccess (nothing in it may ever run as code)
 * when it is missing. The folder lives outside both build outputs, so no
 * deploy ships or replaces this file — the first upload creates it.
 */
function protect_uploads_dir(string $root): void
{
    $file = "$root/.htaccess";
    if (is_file($file)) {
        return;
    }
    $rules = <<<'HTACCESS'
# Uploaded images only. Nothing in this folder may ever run as code.
Options -Indexes -ExecCGI
RemoveHandler .php .phtml .php3 .php4 .php5 .php7 .php8 .phar .pl .py .cgi .sh
RemoveType .php .phtml .php3 .php4 .php5 .php7 .php8 .phar
<FilesMatch "\.(php|phtml|phar|pl|py|cgi|sh|html?|svg|js)$">
  Require all denied
</FilesMatch>
<IfModule mod_headers.c>
  Header always set X-Content-Type-Options "nosniff"
  Header always set Content-Security-Policy "default-src 'none'"
  Header set Cache-Control "public, max-age=31536000, immutable"
</IfModule>

HTACCESS;
    if (@file_put_contents($file, $rules) === false) {
        error_log("[upload] could not write $file");
    }
}

/** What's wrong with the uploads folder, in words the person setting up the server can act on (admins only see this). */
function uploads_setup_hint(string $root): string
{
    $why = match (true) {
        $root === '' || str_contains($root, 'CHANGE_ME') => 'uploads_dir in api/config.php is not filled in',
        !is_dir(dirname($root)) => 'the folder above it does not exist — check the path in uploads_dir in api/config.php',
        is_dir($root) && !is_writable($root) => 'the folder exists but the server can\'t write to it — set its permissions to 755',
        default => 'the server can\'t create or write to it',
    };
    return "Server setup: images can't be saved to $root — $why.";
}

