<?php
/**
 * POST api/blog/upload.php   (multipart/form-data, field "file")
 * Stores a blog image and returns its public URL: { "url": "...", "width": .., "height": .. }
 * See lib/upload.php for how images are cleaned and resized.
 */

declare(strict_types=1);
require __DIR__ . '/../lib/bootstrap.php';
require __DIR__ . '/../lib/upload.php';

require_method('POST');
$user = require_user();
ok(store_image_upload($user, 'blog'));
