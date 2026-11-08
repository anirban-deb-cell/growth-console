<?php
/**
 * POST api/blog/upload.php   (multipart/form-data, field "file")
 * Stores a blog image and returns its public URL: { "url": "...", "width": .., "height": .. }
 *
 * Every image is decoded and re-encoded with GD. That strips EXIF metadata
 * (camera GPS location, device details — important when photos are taken in
 * a hospital) and anything hidden inside the file, and caps its size for the web.
 */

declare(strict_types=1);
require __DIR__ . '/../lib/bootstrap.php';
require __DIR__ . '/../lib/blog.php';

require_method('POST');
$user = require_user();

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
$relDir = 'blog/' . date('Y/m');
$dir = rtrim((string) cfg('uploads_dir'), '/') . '/' . $relDir;
if (!is_dir($dir) && !mkdir($dir, 0755, true) && !is_dir($dir)) {
    throw new RuntimeException("Cannot create upload folder $dir");
}
$name = bin2hex(random_bytes(12)) . '.' . $ext;
$path = "$dir/$name";

$saved = match ($ext) {
    'jpg' => imagejpeg($src, $path, 85),
    'png' => imagepng($src, $path, 7),
    'webp' => imagewebp($src, $path, 85),
};
imagedestroy($src);
if (!$saved) {
    throw new RuntimeException("Could not write $path");
}

$url = rtrim((string) cfg('uploads_url'), '/') . "/$relDir/$name";
$originalName = mb_substr(basename((string) $file['name']), 0, 255);

db()->prepare('INSERT INTO blog_uploads (site_key, url, path, original_name, mime, bytes, width, height, uploaded_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
    ->execute([blog_site(), $url, "$relDir/$name", $originalName, $mime, (int) filesize($path), $width, $height, $user['id']]);
audit($user['id'], 'upload', 'upload', (int) db()->lastInsertId(), ['url' => $url]);

ok(['url' => $url, 'width' => $width, 'height' => $height]);
