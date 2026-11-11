<?php
/**
 * Campaign helpers: input validation, status rules and the JSON shape the
 * console uses (the Campaign interface in src/app/core/data/models.ts).
 * See database/campaign_schema.sql for what each column means.
 */

declare(strict_types=1);
require_once __DIR__ . '/input.php';

const CAMPAIGN_STATUSES = ['draft', 'in_review', 'active', 'paused', 'ended'];
/** Statuses an editor (not admin) may save — launching needs an admin. */
const CAMPAIGN_EDITOR_STATUSES = ['draft', 'in_review'];

/** Channel types per platform — the same five the console's wizard offers. */
const CAMPAIGN_TYPES = [
    'google' => ['Search', 'Performance Max'],
    'meta' => ['Lead form', 'Click-to-WhatsApp', 'Reels & Stories'],
];
const CAMPAIGN_OBJECTIVES = ['calls', 'whatsapp', 'forms', 'visits'];
const CAMPAIGN_LANGUAGES = ['English', 'Hindi', 'Telugu', 'Tamil', 'Kannada', 'Bengali', 'Arabic'];

/**
 * Allowed status changes from the list page (api/campaigns/status.php).
 * Editing the campaign itself goes through save.php.
 */
const CAMPAIGN_TRANSITIONS = [
    'in_review' => ['active', 'draft'],   // approve & launch, or send back
    'active' => ['paused', 'ended'],
    'paused' => ['active', 'ended'],
];

function campaign_date(array $in, string $key, string $label, bool $required): ?string
{
    $value = trim((string) ($in[$key] ?? ''));
    if ($value === '') {
        if ($required) {
            fail("$label is required.", 422, ['field' => $key]);
        }
        return null;
    }
    $date = DateTimeImmutable::createFromFormat('!Y-m-d', $value);
    if (!$date || $date->format('Y-m-d') !== $value) {
        fail("$label must be a valid date (YYYY-MM-DD).", 422, ['field' => $key]);
    }
    return $value;
}

function campaign_phone(array $in, string $key, string $label): ?string
{
    $value = input_str($in, $key, 20);
    if ($value !== null && !preg_match('/^\+?[0-9][0-9 ()-]{5,18}$/', $value)) {
        fail("$label should be a phone number, e.g. +91 98765 43210.", 422, ['field' => $key]);
    }
    return $value;
}

function campaign_int(array $in, string $key, int $min, int $max, string $label, ?int $default = null): ?int
{
    if (!isset($in[$key]) || $in[$key] === '' || $in[$key] === null) {
        return $default;
    }
    if (!is_numeric($in[$key]) || (int) $in[$key] != $in[$key] || (int) $in[$key] < $min || (int) $in[$key] > $max) {
        fail("$label must be a whole number from $min to $max.", 422, ['field' => $key]);
    }
    return (int) $in[$key];
}

/**
 * Validates and normalises a save request from the console's campaign editor.
 * Returns the database columns (JSON columns already encoded).
 */
function campaign_validate(array $in, array $user, ?array $existing): array
{
    // ---- Status ----
    $status = (string) ($in['status'] ?? 'draft');
    if (!in_array($status, CAMPAIGN_STATUSES, true)) {
        fail('Unknown status.', 422, ['field' => 'status']);
    }
    if ($user['role'] !== 'admin') {
        if (!in_array($status, CAMPAIGN_EDITOR_STATUSES, true)) {
            fail('Only an admin can launch a campaign. Send it for approval instead.', 403);
        }
    } elseif (!in_array($status, CAMPAIGN_EDITOR_STATUSES, true) && $status !== ($existing['status'] ?? null)) {
        // Launching, pausing and ending happen from the list (status.php), where the rules are checked.
        fail('Save the campaign first, then change its status from the campaign list.', 422, ['field' => 'status']);
    }

    // ---- Channel & goal ----
    $platform = (string) ($in['platform'] ?? '');
    $type = (string) ($in['type'] ?? '');
    if (!isset(CAMPAIGN_TYPES[$platform]) || !in_array($type, CAMPAIGN_TYPES[$platform], true)) {
        fail('Choose a channel for the campaign.', 422, ['field' => 'type']);
    }
    $objective = (string) ($in['objective'] ?? '');
    if (!in_array($objective, CAMPAIGN_OBJECTIVES, true)) {
        fail('Choose what counts as an enquiry.', 422, ['field' => 'objective']);
    }

    // ---- Audience ----
    $locationMode = (string) ($in['locationMode'] ?? 'radius');
    if (!in_array($locationMode, ['radius', 'cities', 'countries'], true)) {
        fail('Unknown location setting.', 422, ['field' => 'locationMode']);
    }
    $locations = input_list($in['locations'] ?? [], 50, 120, 'Locations');
    if (!$locations) {
        fail('Add at least one location.', 422, ['field' => 'locations']);
    }
    $languages = input_list($in['languages'] ?? [], 20, 40, 'Languages');
    if (!$languages || array_diff($languages, CAMPAIGN_LANGUAGES)) {
        fail('Choose the ad languages from the list.', 422, ['field' => 'languages']);
    }
    $ageMin = campaign_int($in, 'ageMin', 13, 65, 'Minimum age');
    $ageMax = campaign_int($in, 'ageMax', 13, 65, 'Maximum age');
    if ($ageMin !== null && $ageMax !== null && $ageMin > $ageMax) {
        fail('Minimum age can’t be above the maximum age.', 422, ['field' => 'ageMin']);
    }

    // ---- Budget & schedule ----
    $startDate = campaign_date($in, 'startDate', 'Start date', true);
    $endDate = campaign_date($in, 'endDate', 'End date', false);
    if ($endDate !== null && $endDate < $startDate) {
        fail('End date must be on or after the start date.', 422, ['field' => 'endDate']);
    }
    $schedule = (string) ($in['schedule'] ?? 'desk');
    if (!in_array($schedule, ['desk', 'always'], true)) {
        fail('Unknown schedule.', 422, ['field' => 'schedule']);
    }

    // ---- Ad copy ----
    $headlines = input_list($in['headlines'] ?? [], 15, 40, 'Headlines');
    $descriptions = input_list($in['descriptions'] ?? [], 5, 150, 'Descriptions');
    if (!$headlines) {
        fail('Write at least one headline.', 422, ['field' => 'headlines']);
    }
    if (!$descriptions) {
        fail('Write the ad description.', 422, ['field' => 'descriptions']);
    }

    $conversion = input_str($in, 'conversionId', 120);
    if ($conversion !== null && !preg_match('#^AW-\d+/[A-Za-z0-9_-]+$#', $conversion)) {
        fail('Google Ads conversion ID should look like AW-123456789/label.', 422, ['field' => 'conversionId']);
    }
    $compliance = (string) ($in['compliance'] ?? 'pending');
    if (!in_array($compliance, ['pending', 'passed', 'needs_fix'], true)) {
        fail('Unknown compliance state.', 422, ['field' => 'compliance']);
    }

    // ---- Landing page ----
    $landingMode = (string) ($in['landingMode'] ?? 'page');
    if (!in_array($landingMode, ['page', 'url'], true)) {
        fail('Choose where the ad sends people.', 422, ['field' => 'landingMode']);
    }
    $lp = is_array($in['landingPage'] ?? null) ? $in['landingPage'] : [];
    $slug = null;
    $landingUrl = null;
    if ($landingMode === 'page') {
        $slug = input_str($in, 'slug', 160, true, 'Landing page URL');
        if (!preg_match('/^[a-z0-9]+(-[a-z0-9]+)*$/', $slug)) {
            fail('The landing page URL may only use lowercase letters, numbers and hyphens.', 422, ['field' => 'slug']);
        }
        input_str($lp, 'headline', 160, true, 'Landing page headline');
    } else {
        $landingUrl = input_str($in, 'landingUrl', 500, true, 'Landing page');
        if (!preg_match('#^https?://[^\s"<>]+$#i', $landingUrl)) {
            fail('The landing page must be a full web address (https://…).', 422, ['field' => 'landingUrl']);
        }
    }
    $images = [];
    foreach (input_list($lp['images'] ?? [], 6, 500, 'Landing page photos') as $img) {
        $images[] = input_image($img);
    }
    $phone = campaign_phone($in, 'phone', 'Phone number');
    $whatsapp = campaign_phone($in, 'whatsapp', 'WhatsApp number');
    if ($landingMode === 'page' && $objective === 'calls' && $phone === null) {
        fail('Add the phone number the landing page’s call button should dial.', 422, ['field' => 'phone']);
    }
    if ($landingMode === 'page' && $objective === 'whatsapp' && $whatsapp === null) {
        fail('Add the WhatsApp number the landing page should open.', 422, ['field' => 'whatsapp']);
    }

    $json = fn (array $v) => json_encode($v, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);

    return [
        'name' => input_str($in, 'name', 160, true, 'Campaign name'),
        'platform' => $platform,
        'type' => $type,
        'objective' => $objective,
        'specialty' => input_str($in, 'specialty', 120, true, 'Specialty'),
        'branch' => input_str($in, 'branch', 120) ?? 'All branches',
        'status' => $status,
        'compliance' => $compliance,
        'daily_budget' => campaign_int($in, 'dailyBudget', 200, 10_000_000, 'Daily budget (₹)') ?? fail('Daily budget is required.', 422, ['field' => 'dailyBudget']),
        'start_date' => $startDate,
        'end_date' => $endDate,
        'run_schedule' => $schedule,
        'location_mode' => $locationMode,
        'radius_km' => $locationMode === 'radius' ? campaign_int($in, 'radiusKm', 1, 100, 'Radius (km)', 15) : null,
        'locations' => $json($locations),
        'languages' => $json(array_values(array_unique($languages))),
        'age_min' => $ageMin,
        'age_max' => $ageMax,
        'keywords' => $json(array_values(array_unique(input_list($in['keywords'] ?? [], 200, 80, 'Keywords')))),
        'headlines' => $json($headlines),
        'descriptions' => $json($descriptions),
        'tracking_number' => !empty($in['trackingNumber']) ? 1 : 0,
        'whatsapp_routing' => !empty($in['whatsappRouting']) ? 1 : 0,
        'conversion_id' => $conversion,
        'landing_mode' => $landingMode,
        'landing_url' => $landingUrl,
        'slug' => $slug,
        'lp_headline' => input_str($lp, 'headline', 160),
        'lp_subheadline' => input_str($lp, 'subheadline', 300),
        'lp_offer' => input_str($lp, 'offer', 160),
        'lp_body' => $json(input_list($lp['body'] ?? [], 30, 5000, 'Landing page text')),
        'lp_highlights' => $json(input_list($lp['highlights'] ?? [], 10, 160, 'Highlights')),
        'lp_images' => $json($images),
        'lp_youtube_id' => input_youtube(isset($lp['youtubeId']) ? trim((string) $lp['youtubeId']) : null),
        'lp_cta_label' => input_str($lp, 'ctaLabel', 40),
        'phone' => $phone,
        'whatsapp' => $whatsapp,
    ];
}

/** Where the ad sends people, without tracking parameters. */
function campaign_destination(array $row): string
{
    if ($row['landing_mode'] === 'url') {
        return (string) $row['landing_url'];
    }
    return rtrim((string) cfg('site_url'), '/') . '/campaigns/' . $row['slug'];
}

/** The link to use in the ad: the destination plus UTM tags, so GA4 can attribute visits. */
function campaign_ad_url(array $row): string
{
    $url = campaign_destination($row);
    $utm = http_build_query([
        'utm_source' => $row['platform'],
        'utm_medium' => 'cpc',
        'utm_campaign' => slugify((string) $row['name']) ?: 'campaign',
    ]);
    return $url . (str_contains($url, '?') ? '&' : '?') . $utm;
}

/** One campaign in the console's shape — the list and the editor use the same one. */
function campaign_admin(array $row): array
{
    return [
        'id' => (string) $row['id'],
        'name' => $row['name'],
        'platform' => $row['platform'],
        'type' => $row['type'],
        'objective' => $row['objective'],
        'specialty' => $row['specialty'],
        'branch' => $row['branch'],
        'status' => $row['status'],
        'compliance' => $row['compliance'],
        'dailyBudget' => (int) $row['daily_budget'],
        'startDate' => $row['start_date'],
        'endDate' => $row['end_date'] ?: null,
        'schedule' => $row['run_schedule'],
        'locationMode' => $row['location_mode'],
        'radiusKm' => $row['radius_km'] === null ? null : (int) $row['radius_km'],
        'locations' => json_list($row['locations']),
        'languages' => json_list($row['languages']),
        'ageMin' => $row['age_min'] === null ? null : (int) $row['age_min'],
        'ageMax' => $row['age_max'] === null ? null : (int) $row['age_max'],
        'keywords' => json_list($row['keywords']),
        'headlines' => json_list($row['headlines']),
        'descriptions' => json_list($row['descriptions']),
        'trackingNumber' => (bool) $row['tracking_number'],
        'whatsappRouting' => (bool) $row['whatsapp_routing'],
        'conversionId' => $row['conversion_id'] ?: null,
        'landingMode' => $row['landing_mode'],
        'slug' => $row['slug'],
        'landingUrl' => campaign_destination($row),
        'adUrl' => campaign_ad_url($row),
        'landingPage' => [
            'headline' => $row['lp_headline'] ?? '',
            'subheadline' => $row['lp_subheadline'] ?: null,
            'offer' => $row['lp_offer'] ?: null,
            'body' => json_list($row['lp_body']),
            'highlights' => json_list($row['lp_highlights']),
            'images' => json_list($row['lp_images']),
            'youtubeId' => $row['lp_youtube_id'] ?: null,
            'ctaLabel' => $row['lp_cta_label'] ?: null,
        ],
        'phone' => $row['phone'] ?: null,
        'whatsapp' => $row['whatsapp'] ?: null,
        'createdAt' => substr((string) $row['created_at'], 0, 10),
        'updatedAt' => $row['updated_at'],
    ];
}

function campaign_find(int $id): ?array
{
    $stmt = db()->prepare('SELECT * FROM campaigns WHERE id = ? AND site_key = ?');
    $stmt->execute([$id, site_key()]);
    return $stmt->fetch() ?: null;
}
