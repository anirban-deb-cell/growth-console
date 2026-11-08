import { Component, WritableSignal, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CampaignObjective, CampaignType, Platform } from '../../core/data/models';
import { SPECIALTIES } from '../../core/data/mock-data';
import { BlogStore, CampaignStore, ClientStore, ToastService } from '../../core/data/stores';
import { checkCompliance, suggestRewrite } from '../../shared/compliance';
import { fmt, inr } from '../../shared/format';

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

/** Sample cost-per-enquiry benchmarks used for the estimate (₹). */
const CPL_BENCHMARK: Record<string, number> = {
  Orthopedics: 430, Cardiology: 560, 'IVF & Fertility': 690, Dermatology: 340, Pediatrics: 280, 'General medicine': 260, 'International patients': 1400
};

const LANGUAGES = ['English', 'Hindi', 'Telugu', 'Tamil', 'Kannada', 'Bengali', 'Arabic'];
const COUNTRIES = ['Bangladesh', 'UAE', 'Oman', 'Kenya', 'Nigeria', 'Iraq', 'Maldives', 'UK'];

@Component({
  selector: 'app-campaign-new-page',
  imports: [FormsModule, RouterLink],
  templateUrl: './campaign-new.page.html',
  styleUrl: './campaign-new.page.scss'
})
export class CampaignNewPage {
  private campaigns = inject(CampaignStore);
  private blog = inject(BlogStore);
  clients = inject(ClientStore);
  private toast = inject(ToastService);
  private router = inject(Router);

  readonly steps = ['Goal & channel', 'Audience', 'Budget & schedule', 'Ad copy', 'Tracking & review'];
  readonly channels = CHANNELS;
  readonly objectives = OBJECTIVES;
  readonly specialties = SPECIALTIES;
  readonly languages = LANGUAGES;
  readonly countries = COUNTRIES;
  readonly budgetPresets = [1000, 2000, 3500, 5000];

  step = signal(0);
  client = this.clients.current;

  // Step 1
  name = '';
  channelId = signal('g-search');
  objective = signal<CampaignObjective>('calls');
  specialty = '';
  branch = 'All branches';

  // Step 2
  locationMode = signal<'radius' | 'cities' | 'countries'>('radius');
  radiusKm = 15;
  cities = 'Hyderabad, Secunderabad';
  selectedCountries = signal<string[]>(['Bangladesh', 'Oman']);
  selectedLanguages = signal<string[]>(['English', 'Telugu']);
  ageMin = 25;
  ageMax = 65;
  keywords = '';

  // Step 3
  dailyBudget = 2000;
  startDate = new Date().toISOString().slice(0, 10);
  endDate = '';
  schedule = signal<'always' | 'desk'>('desk');

  // Step 4
  headlines = ['', '', ''];
  description = '';
  landingUrl = '';

  // Step 5
  trackingNumber = true;
  whatsappNumber = true;
  conversionId = '';

  channel = computed(() => CHANNELS.find((c) => c.id === this.channelId())!);
  isGoogleSearch = computed(() => this.channel().type === 'Search');
  isMeta = computed(() => this.channel().platform === 'meta');

  landingOptions = computed(() => {
    const site = 'https://' + this.client().website;
    const posts = this.blog.forClient(this.client().id).filter((p) => p.status === 'published');
    return [
      { label: 'Home page', url: site + '/' },
      { label: 'Book an appointment', url: site + '/book-appointment' },
      ...posts.map((p) => ({ label: 'Blog · ' + p.title, url: `${site}/blog/${p.slug}` }))
    ];
  });

  // Recomputed on every change detection pass — cheap at this size, and keeps the ngModel fields plain.
  get adText(): string {
    return [...this.headlines, this.description].filter((t) => t.trim()).join(' ');
  }

  get googleTitle(): string {
    return this.headlines.map((h) => h.trim()).filter(Boolean).join(' | ') || 'Your headline';
  }

  get findings() {
    return checkCompliance(this.adText);
  }

  get estimate() {
    const monthly = this.dailyBudget * 30.4;
    const cpl = CPL_BENCHMARK[this.specialty] ?? 450;
    const mid = monthly / cpl;
    return { monthly: inr(monthly), low: fmt(mid * 0.8), high: fmt(mid * 1.2), cpl: inr(cpl) };
  }

  get utm(): string {
    const slug = (this.name || 'campaign').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    return `?utm_source=${this.channel().platform}&utm_medium=cpc&utm_campaign=${slug}`;
  }

  get locationSummary(): string {
    if (this.locationMode() === 'radius') return `${this.branch === 'All branches' ? 'Each branch' : this.branch} + ${this.radiusKm} km`;
    if (this.locationMode() === 'cities') return this.cities || '—';
    return this.selectedCountries().join(', ') || '—';
  }

  get stepValid(): boolean {
    switch (this.step()) {
      case 0: return !!this.name.trim() && !!this.specialty;
      case 1: return this.selectedLanguages().length > 0 && (this.locationMode() !== 'countries' || this.selectedCountries().length > 0);
      case 2: return this.dailyBudget >= 200 && !!this.startDate;
      case 3: return !!this.headlines[0].trim() && !!this.description.trim() && !!this.landingUrl;
      default: return true;
    }
  }

  inr = inr;

  /** Picks the channel and the enquiry type that channel naturally produces. */
  pickChannel(id: string): void {
    this.channelId.set(id);
    const defaults: Record<string, CampaignObjective> = { 'm-wa': 'whatsapp', 'm-lead': 'forms', 'g-search': 'calls' };
    if (defaults[id]) this.objective.set(defaults[id]);
  }

  suggestName(): void {
    if (this.name.trim() || !this.specialty) return;
    this.name = `${this.specialty} · ${this.channel().title.replace('Meta · ', '')}`;
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
  }

  next(): void {
    if (!this.stepValid) return;
    this.step.update((s) => Math.min(this.steps.length - 1, s + 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  back(): void {
    this.step.update((s) => Math.max(0, s - 1));
  }

  goTo(i: number): void {
    if (i < this.step()) this.step.set(i);
  }

  save(submit: boolean): void {
    const c = this.channel();
    const locations = this.locationMode() === 'radius' ? [this.locationSummary] : this.locationMode() === 'cities' ? this.cities.split(',').map((s) => s.trim()).filter(Boolean) : this.selectedCountries();
    const flagged = this.findings.length > 0;
    this.campaigns.add({
      clientId: this.client().id,
      name: this.name.trim(),
      platform: c.platform,
      type: c.type,
      objective: this.objective(),
      specialty: this.specialty,
      branch: this.branch,
      status: submit ? 'in_review' : 'draft',
      compliance: flagged ? 'needs_fix' : submit ? 'passed' : 'pending',
      dailyBudget: this.dailyBudget,
      spend: 0, impressions: 0, clicks: 0, enquiries: 0, appointments: 0,
      startDate: this.startDate,
      endDate: this.endDate || undefined,
      locations,
      languages: this.selectedLanguages(),
      keywords: this.keywords.split('\n').map((k) => k.trim()).filter(Boolean),
      headlines: this.headlines.map((h) => h.trim()).filter(Boolean),
      descriptions: [this.description.trim()],
      landingUrl: this.landingUrl + this.utm
    });
    this.toast.show(submit ? `“${this.name.trim()}” sent for client approval` : `“${this.name.trim()}” saved as draft`);
    this.router.navigateByUrl('/campaigns');
  }
}
