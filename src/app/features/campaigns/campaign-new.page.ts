import { Component, OnDestroy, OnInit, WritableSignal, computed, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService, apiMessage } from '../../core/auth/auth.service';
import { Campaign, CampaignLandingMode, CampaignObjective, CampaignSaveInput, CampaignStatus, CampaignType, Platform } from '../../core/data/models';
import { campaignAudience } from '../../core/data/audience';
import { ClientStore, ToastService } from '../../core/data/stores';
import { checkCompliance, suggestRewrite } from '../../shared/compliance';
import { fmt, inr } from '../../shared/format';
import { BlogRepository } from '../blog/blog-repository';
import { CampaignRepository, slugify } from './campaign-repository';

interface ChannelOption {
  id: string;
  platform: Platform;
  type: CampaignType;
  title: string;
  detail: string;
}

const CHANNELS: ChannelOption[] = [
  { id: 'g-search', platform: 'google', type: 'Search', title: 'Google Search', detail: 'Show up when patients search “knee replacement near me”.' },
  { id: 'g-pmax', platform: 'google', type: 'Performance Max', title: 'Google Performance Max', detail: 'Search, Maps, YouTube and Display from one budget.' },
  { id: 'm-wa', platform: 'meta', type: 'Click-to-WhatsApp', title: 'Meta · Click-to-WhatsApp', detail: 'Facebook & Instagram ads that open a WhatsApp chat.' },
  { id: 'm-lead', platform: 'meta', type: 'Lead form', title: 'Meta · Lead form', detail: 'Patients leave their number without leaving Facebook.' },
  { id: 'm-reels', platform: 'meta', type: 'Reels & Stories', title: 'Meta · Reels & Stories', detail: 'Short video for awareness and doctor introductions.' }
];

const OBJECTIVES: { id: CampaignObjective; title: string; detail: string }[] = [
  { id: 'calls', title: 'Phone calls', detail: 'Tracked number per campaign' },
  { id: 'whatsapp', title: 'WhatsApp chats', detail: 'Opens a chat with the front desk' },
  { id: 'forms', title: 'Form enquiries', detail: 'Appointment request form' },
  { id: 'visits', title: 'Branch visits', detail: 'Directions and walk-ins' }
];

/** Landing page button text when none is typed. */
const DEFAULT_CTA: Record<CampaignObjective, string> = {
  calls: 'Call now',
  whatsapp: 'Chat on WhatsApp',
  forms: 'Book a consultation',
  visits: 'Get directions'
};

const LANGUAGES = ['English', 'Hindi', 'Telugu', 'Tamil', 'Kannada', 'Bengali', 'Arabic'];
const COUNTRIES = ['Bangladesh', 'UAE', 'Oman', 'Kenya', 'Nigeria', 'Iraq', 'Maldives', 'UK'];
const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const PHONE_PATTERN = /^\+?[0-9][0-9 ()-]{5,18}$/;
const CONVERSION_ID_PATTERN = /^AW-\d+\/[A-Za-z0-9_-]+$/;
const MAX_LP_IMAGES = 6;

interface LpImage {
  /** Public URL (filled in by the upload) or a link pasted by hand. */
  path: string;
  previewUrl?: string;
  uploading?: boolean;
  error?: string;
}

/**
 * New / edit campaign: the ad setup (channel, audience, budget, copy) plus
 * where the ad sends people — the campaign's own landing page on the website
 * (/campaigns/<slug>, not in the site's menu) or an existing page.
 * Saved as a draft or sent for client approval; an admin launches it from
 * the campaign list.
 */
@Component({
  selector: 'app-campaign-new-page',
  imports: [FormsModule, RouterLink],
  templateUrl: './campaign-new.page.html',
  styleUrl: './campaign-new.page.scss'
})
export class CampaignNewPage implements OnInit, OnDestroy {
  private repo = inject(CampaignRepository);
  private blog = inject(BlogRepository);
  private auth = inject(AuthService);
  clients = inject(ClientStore);
  private toast = inject(ToastService);
  private router = inject(Router);
  readonly isMock = this.repo.mode === 'mock';

  /** Route param from /campaigns/:id/edit (component input binding). */
  id = input<string>();
  editing?: Campaign;
  loading = false;
  loadError = '';
  saving = false;
  saveError = '';

  readonly steps = ['Goal & channel', 'Audience', 'Budget & schedule', 'Ad copy', 'Landing page', 'Tracking & review'];
  readonly channels = CHANNELS;
  readonly objectives = OBJECTIVES;
  readonly languages = LANGUAGES;
  readonly countries = COUNTRIES;
  readonly budgetPresets = [1000, 2000, 3500, 5000];
  readonly maxLpImages = MAX_LP_IMAGES;

  step = signal(0);
  client = this.clients.current;
  /** Hospital (patients) or agency (new business) — changes labels and options. */
  audience = computed(() => campaignAudience(this.client()));
  objectiveOptions = computed(() => OBJECTIVES.filter((o) => this.audience().objectives.includes(o.id)));

  // Step 1 — goal & channel
  name = '';
  channelId = signal('g-search');
  objective = signal<CampaignObjective>(campaignAudience(this.clients.current()).agency ? 'forms' : 'calls');
  specialty = '';
  branch = 'All branches';

  // Step 2 — audience
  locationMode = signal<'radius' | 'cities' | 'countries'>('radius');
  radiusKm = 15;
  cities = 'Hyderabad, Secunderabad';
  selectedCountries = signal<string[]>(['Bangladesh', 'Oman']);
  selectedLanguages = signal<string[]>(['English', 'Telugu']);
  ageMin = 25;
  ageMax = 65;
  keywords = '';

  // Step 3 — budget & schedule
  dailyBudget = 2000;
  startDate = new Date().toISOString().slice(0, 10);
  endDate = '';
  schedule = signal<'always' | 'desk'>('desk');

  // Step 4 — ad copy
  headlines = ['', '', ''];
  description = '';

  // Step 5 — landing page
  landingMode = signal<CampaignLandingMode>('page');
  slug = '';
  private slugEdited = false;
  lpHeadline = '';
  lpSubheadline = '';
  lpOffer = '';
  lpBody = '';
  lpHighlights = '';
  lpImages: LpImage[] = [];
  lpVideoUrl = '';
  ctaLabel = '';
  phone = '';
  whatsapp = '';
  landingUrl = '';
  landingOptions = signal<{ label: string; url: string }[]>([]);

  // Step 6 — tracking
  trackingNumber = true;
  whatsappNumber = true;
  conversionId = '';

  channel = computed(() => CHANNELS.find((c) => c.id === this.channelId())!);
  isGoogleSearch = computed(() => this.channel().type === 'Search');
  isMeta = computed(() => this.channel().platform === 'meta');

  get siteUrl(): string {
    return 'https://' + this.client().website;
  }

  /** Editing a campaign that is already running (admins only) keeps its status. */
  get isLive(): boolean {
    return this.editing?.status === 'active' || this.editing?.status === 'paused';
  }

  ngOnInit(): void {
    this.loadLandingOptions();
    if (this.id()) this.loadCampaign(this.id()!);
  }

  ngOnDestroy(): void {
    this.lpImages.forEach((img) => this.revoke(img));
  }

  private async loadLandingOptions(): Promise<void> {
    const site = this.siteUrl;
    const base = [
      { label: 'Home page', url: site + '/' },
      { label: 'Contact page', url: site + '/contact' }
    ];
    this.landingOptions.set(base);
    try {
      const posts = (await this.blog.list()).filter((p) => p.status === 'published');
      this.landingOptions.set([...base, ...posts.map((p) => ({ label: 'Blog · ' + p.title, url: `${site}/blog/${p.slug}` }))]);
    } catch {
      // Blog posts are only suggestions; any address can still be typed.
    }
  }

  /** Opens an existing campaign, filling every step. */
  private async loadCampaign(id: string): Promise<void> {
    this.loading = true;
    this.loadError = '';
    try {
      const c = await this.repo.get(id);
      if (!c) throw new Error('This campaign no longer exists.');
      if (c.status === 'ended') throw new Error('This campaign has ended and can’t be changed.');
      this.editing = c;
      this.name = c.name;
      this.channelId.set(CHANNELS.find((ch) => ch.platform === c.platform && ch.type === c.type)?.id ?? 'g-search');
      this.objective.set(c.objective);
      this.specialty = c.specialty;
      this.branch = c.branch;

      const mode = c.locationMode ?? (c.locations.length && c.locations.every((l) => COUNTRIES.includes(l)) ? 'countries' : 'cities');
      this.locationMode.set(mode);
      if (mode === 'radius') this.radiusKm = c.radiusKm ?? 15;
      if (mode === 'cities') this.cities = c.locations.join(', ');
      if (mode === 'countries') this.selectedCountries.set(c.locations.filter((l) => COUNTRIES.includes(l)));
      this.selectedLanguages.set(c.languages.filter((l) => LANGUAGES.includes(l)));
      this.ageMin = c.ageMin ?? 25;
      this.ageMax = c.ageMax ?? 65;
      this.keywords = c.keywords.join('\n');

      this.dailyBudget = c.dailyBudget;
      this.startDate = c.startDate;
      this.endDate = c.endDate ?? '';
      this.schedule.set(c.schedule ?? 'desk');

      this.headlines = [...c.headlines, '', '', ''].slice(0, Math.max(3, c.headlines.length));
      this.description = c.descriptions[0] ?? '';

      this.landingMode.set(c.landingMode ?? 'url');
      this.slug = c.slug ?? '';
      this.slugEdited = !!c.slug;
      const lp = c.landingPage;
      this.lpHeadline = lp?.headline ?? '';
      this.lpSubheadline = lp?.subheadline ?? '';
      this.lpOffer = lp?.offer ?? '';
      this.lpBody = (lp?.body ?? []).join('\n\n');
      this.lpHighlights = (lp?.highlights ?? []).join('\n');
      this.lpImages = (lp?.images ?? []).map((url) => ({ path: url, previewUrl: this.previewFor(url) }));
      this.lpVideoUrl = lp?.youtubeId ? `https://youtu.be/${lp.youtubeId}` : '';
      this.ctaLabel = lp?.ctaLabel ?? '';
      this.phone = c.phone ?? '';
      this.whatsapp = c.whatsapp ?? '';
      this.landingUrl = c.landingMode === 'page' ? '' : c.landingUrl.split('?')[0];

      this.trackingNumber = c.trackingNumber ?? true;
      this.whatsappNumber = c.whatsappRouting ?? true;
      this.conversionId = c.conversionId ?? '';
    } catch (err) {
      this.loadError = apiMessage(err, 'Couldn’t open this campaign.');
    } finally {
      this.loading = false;
    }
  }

  // ---- Derived values ----

  /** Ad copy + landing page text — everything the compliance check reads. */
  /** The service / specialty choices, keeping an older saved value that's no longer in the list. */
  get offeringOptions(): string[] {
    const list = this.audience().offerings;
    return this.specialty && !list.includes(this.specialty) ? [this.specialty, ...list] : list;
  }

  get adText(): string {
    const lp = this.landingMode() === 'page' ? [this.lpHeadline, this.lpSubheadline, this.lpOffer, this.lpBody, this.lpHighlights] : [];
    return [...this.headlines, this.description, ...lp].filter((t) => t.trim()).join(' ');
  }

  get googleTitle(): string {
    return this.headlines.map((h) => h.trim()).filter(Boolean).join(' | ') || 'Your headline';
  }

  get findings() {
    return checkCompliance(this.adText);
  }

  get estimate() {
    const monthly = this.dailyBudget * 30.4;
    const cpl = this.audience().cplBenchmark[this.specialty] ?? this.audience().defaultCpl;
    const mid = monthly / cpl;
    return { monthly: inr(monthly), low: fmt(mid * 0.8), high: fmt(mid * 1.2), cpl: inr(cpl) };
  }

  get utm(): string {
    return `?utm_source=${this.channel().platform}&utm_medium=cpc&utm_campaign=${slugify(this.name) || 'campaign'}`;
  }

  /** Where the ad sends people, before tracking parameters. */
  get destination(): string {
    return this.landingMode() === 'page' ? `${this.siteUrl}/campaigns/${this.effectiveSlug || 'your-page'}` : this.landingUrl || this.siteUrl + '/';
  }

  get effectiveSlug(): string {
    return this.slugEdited ? this.slug : slugify(this.name);
  }

  get ctaText(): string {
    return this.ctaLabel.trim() || DEFAULT_CTA[this.objective()];
  }

  get highlightList(): string[] {
    return this.lines(this.lpHighlights);
  }

  /** The landing page's top photo, for the preview. */
  get heroImage(): string {
    const first = this.lpImages[0];
    return first ? first.previewUrl || this.previewFor(first.path.trim()) : '';
  }

  /**
   * Where the console can show an image from. Uploads are full URLs already;
   * a site path like /assets/images/x.jpg lives on the website, not here.
   */
  previewFor(path: string): string {
    return path.startsWith('/') && !path.startsWith('/uploads/') ? this.siteUrl + path : path;
  }

  get needsPhone(): boolean {
    return this.objective() === 'calls';
  }

  get needsWhatsapp(): boolean {
    return this.objective() === 'whatsapp';
  }

  get uploadsPending(): boolean {
    return this.lpImages.some((i) => i.uploading);
  }

  get locationSummary(): string {
    if (this.locationMode() === 'radius') {
      const centre = !this.audience().showBranch ? this.client().city : this.branch === 'All branches' ? 'Each branch' : this.branch;
      return `${centre} + ${this.radiusKm} km`;
    }
    if (this.locationMode() === 'cities') return this.cities || '—';
    return this.selectedCountries().join(', ') || '—';
  }

  /** Why the current step can't continue yet (shown under the buttons), or ''. */
  get stepProblem(): string {
    return this.problemFor(this.step());
  }

  get stepValid(): boolean {
    return !this.stepProblem;
  }

  private problemFor(step: number): string {
    switch (step) {
      case 0:
        if (!this.specialty) return `Choose a ${this.audience().offeringLabel.toLowerCase()}.`;
        if (!this.objectiveOptions().some((o) => o.id === this.objective())) return 'Choose what counts as an enquiry.';
        return this.name.trim() ? '' : 'Give the campaign a name.';
      case 1:
        if (!this.selectedLanguages().length) return 'Choose at least one ad language.';
        if (this.locationMode() === 'countries' && !this.selectedCountries().length) return 'Choose at least one country.';
        if (this.locationMode() === 'cities' && !this.cityList.length) return 'Add at least one city.';
        if (this.isMeta() && this.ageMin > this.ageMax) return 'Minimum age can’t be above the maximum age.';
        return '';
      case 2:
        if (!(this.dailyBudget >= 200)) return 'Daily budget must be at least ₹200.';
        if (!this.startDate) return 'Choose a start date.';
        return this.endDate && this.endDate < this.startDate ? 'End date must be on or after the start date.' : '';
      case 3:
        if (!this.headlines[0].trim()) return 'Write the first headline.';
        return this.description.trim() ? '' : 'Write the ad description.';
      case 4:
        if (this.landingMode() === 'url') return /^https?:\/\/\S+$/i.test(this.landingUrl.trim()) ? '' : 'Choose a page, or paste a full address starting with https://';
        if (!SLUG_PATTERN.test(this.effectiveSlug)) return 'The page address may only use lowercase letters, numbers and hyphens.';
        if (!this.lpHeadline.trim()) return 'Write the landing page headline.';
        if (this.needsPhone && !PHONE_PATTERN.test(this.phone.trim())) return 'Add the phone number the call button should dial.';
        if (this.needsWhatsapp && !PHONE_PATTERN.test(this.whatsapp.trim())) return 'Add the WhatsApp number patients should reach.';
        if (this.phone.trim() && !PHONE_PATTERN.test(this.phone.trim())) return 'The phone number doesn’t look right.';
        if (this.whatsapp.trim() && !PHONE_PATTERN.test(this.whatsapp.trim())) return 'The WhatsApp number doesn’t look right.';
        if (this.lpVideoUrl.trim() && !this.extractYoutubeId(this.lpVideoUrl)) return 'That YouTube link doesn’t look right.';
        return this.uploadsPending ? 'Wait for the photos to finish uploading.' : '';
      case 5:
        return this.conversionId.trim() && !CONVERSION_ID_PATTERN.test(this.conversionId.trim()) ? 'Google Ads conversion ID should look like AW-123456789/label.' : '';
      default:
        return '';
    }
  }

  /** Furthest step the stepper lets you jump to: every step before it must be complete. */
  get reachable(): number {
    for (let i = 0; i < this.steps.length; i++) {
      if (this.problemFor(i)) return i;
    }
    return this.steps.length - 1;
  }

  private get cityList(): string[] {
    return this.cities.split(',').map((s) => s.trim()).filter(Boolean);
  }

  inr = inr;

  // ---- Actions ----

  /** Picks the channel and the enquiry type that channel naturally produces. */
  pickChannel(id: string): void {
    this.channelId.set(id);
    const defaults: Record<string, CampaignObjective> = { 'm-wa': 'whatsapp', 'm-lead': 'forms', 'g-search': this.audience().agency ? 'forms' : 'calls' };
    if (defaults[id]) this.objective.set(defaults[id]);
  }

  suggestName(): void {
    if (this.name.trim() || !this.specialty) return;
    this.name = `${this.specialty} · ${this.channel().title.replace('Meta · ', '')}`;
  }

  onSlugInput(value: string): void {
    this.slugEdited = true;
    this.slug = slugify(value);
  }

  /** Starts the landing page from the ad: same headline and description. */
  prefillLandingPage(): void {
    if (!this.lpHeadline.trim()) this.lpHeadline = this.headlines[0].trim();
    if (!this.lpSubheadline.trim()) this.lpSubheadline = this.description.trim();
  }

  pickLocationMode(mode: 'radius' | 'cities' | 'countries'): void {
    this.locationMode.set(mode);
    if (mode === 'countries' && !this.selectedLanguages().includes('Arabic')) {
      this.selectedLanguages.update((l) => [...l, 'Arabic']);
    }
  }

  toggleIn(list: WritableSignal<string[]>, value: string): void {
    list.update((l) => (l.includes(value) ? l.filter((v) => v !== value) : [...l, value]));
  }

  headlineLimit = 30;
  descriptionLimit = 90;

  applyRewrite(): void {
    this.headlines = this.headlines.map((h) => (h ? suggestRewrite(h) : h));
    this.description = suggestRewrite(this.description);
    this.lpHeadline = suggestRewrite(this.lpHeadline);
    this.lpSubheadline = suggestRewrite(this.lpSubheadline);
    this.lpOffer = suggestRewrite(this.lpOffer);
    this.lpBody = this.lpBody.split('\n').map(suggestRewrite).join('\n');
    this.lpHighlights = this.lpHighlights.split('\n').map(suggestRewrite).join('\n');
  }

  next(): void {
    if (!this.stepValid) return;
    if (this.step() === 3) this.prefillLandingPage();
    this.step.update((s) => Math.min(this.steps.length - 1, s + 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  back(): void {
    this.step.update((s) => Math.max(0, s - 1));
  }

  goTo(i: number): void {
    if (i <= this.reachable) this.step.set(i);
  }

  // ---- Landing page photos ----

  addImage(): void {
    if (this.lpImages.length < MAX_LP_IMAGES) this.lpImages.push({ path: '' });
  }

  removeImage(index: number): void {
    this.revoke(this.lpImages[index]);
    this.lpImages.splice(index, 1);
  }

  onImageSelected(event: Event, image: LpImage): void {
    const inputEl = event.target as HTMLInputElement;
    const file = inputEl.files?.[0];
    if (!file) return;
    this.revoke(image);
    image.previewUrl = URL.createObjectURL(file);
    image.error = undefined;
    image.uploading = true;
    // Clear the input so picking the same file again still triggers a change.
    inputEl.value = '';
    this.repo
      .upload(file)
      .then((url) => (image.path = url))
      .catch((err) => {
        image.error = apiMessage(err, 'Upload failed.');
        image.path = '';
      })
      .finally(() => (image.uploading = false));
  }

  private revoke(image: LpImage | undefined): void {
    if (image?.previewUrl?.startsWith('blob:')) URL.revokeObjectURL(image.previewUrl);
  }

  extractYoutubeId(value: string): string {
    const trimmed = (value ?? '').trim();
    if (!trimmed) return '';
    const match = trimmed.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|watch\?v=|shorts\/))([a-zA-Z0-9_-]{11})/);
    if (match) return match[1];
    return /^[a-zA-Z0-9_-]{11}$/.test(trimmed) ? trimmed : '';
  }

  // ---- Save ----

  private buildSaveInput(status: CampaignStatus): CampaignSaveInput {
    const c = this.channel();
    const mode = this.locationMode();
    const locations = mode === 'radius' ? [this.locationSummary] : mode === 'cities' ? this.cityList : this.selectedCountries();
    const page = this.landingMode() === 'page';
    return {
      id: this.editing?.id,
      name: this.name.trim(),
      platform: c.platform,
      type: c.type,
      objective: this.objective(),
      specialty: this.specialty,
      branch: this.branch,
      status,
      compliance: this.findings.length ? 'needs_fix' : 'passed',
      dailyBudget: Number(this.dailyBudget),
      startDate: this.startDate,
      endDate: this.endDate || undefined,
      schedule: this.schedule(),
      locationMode: mode,
      radiusKm: mode === 'radius' ? Number(this.radiusKm) : undefined,
      locations,
      languages: this.selectedLanguages(),
      ageMin: this.isMeta() ? Number(this.ageMin) : undefined,
      ageMax: this.isMeta() ? Number(this.ageMax) : undefined,
      keywords: this.isGoogleSearch() ? this.lines(this.keywords) : [],
      headlines: this.headlines.map((h) => h.trim()).filter(Boolean),
      descriptions: [this.description.trim()],
      trackingNumber: this.trackingNumber,
      whatsappRouting: this.whatsappNumber,
      conversionId: this.conversionId.trim() || undefined,
      landingMode: this.landingMode(),
      slug: page ? this.effectiveSlug : undefined,
      landingUrl: page ? undefined : this.landingUrl.trim(),
      landingPage: {
        headline: page ? this.lpHeadline.trim() : '',
        subheadline: this.lpSubheadline.trim() || null,
        offer: this.lpOffer.trim() || null,
        body: this.lpBody.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean),
        highlights: this.highlightList,
        images: this.lpImages.map((i) => i.path.trim()).filter((p) => p && !p.startsWith('blob:')),
        youtubeId: this.extractYoutubeId(this.lpVideoUrl) || null,
        ctaLabel: this.ctaLabel.trim() || null
      },
      phone: this.phone.trim() || undefined,
      whatsapp: this.whatsapp.trim() || undefined,
      expectedUpdatedAt: this.editing?.updatedAt
    };
  }

  /** submit: send for client approval; otherwise save as draft (or keep a live campaign's status). */
  async save(submit: boolean): Promise<void> {
    for (let i = 0; i < this.steps.length; i++) {
      if (this.problemFor(i)) {
        this.step.set(i);
        this.saveError = this.problemFor(i);
        return;
      }
    }
    if (this.saving) return;
    const status: CampaignStatus = this.isLive ? this.editing!.status : submit ? 'in_review' : 'draft';
    this.saving = true;
    this.saveError = '';
    try {
      const saved = await this.repo.save(this.buildSaveInput(status));
      const msg = this.isLive
        ? `“${saved.name}” updated · change the live ad in ${saved.platform === 'google' ? 'Google Ads' : 'Meta'} too`
        : submit
          ? `“${saved.name}” sent for client approval`
          : `“${saved.name}” saved as draft`;
      this.toast.show(msg);
      this.router.navigateByUrl('/campaigns');
    } catch (err) {
      this.saveError = apiMessage(err, 'Couldn’t save the campaign.');
    } finally {
      this.saving = false;
    }
  }

  get isAdmin(): boolean {
    return this.auth.user()?.role === 'admin';
  }

  private lines(text: string): string[] {
    return text.split('\n').map((l) => l.trim()).filter(Boolean);
  }
}
