import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Campaign, CampaignSaveInput, CampaignStats, CampaignStatus } from '../../core/data/models';
import { CampaignStore, ClientStore } from '../../core/data/stores';

/**
 * Where campaigns come from. The pages only talk to this, so switching
 * between the PHP API and sample data is the `dataSource` setting in
 * src/environments — nothing else changes.
 */
export abstract class CampaignRepository {
  abstract readonly mode: 'api' | 'mock';
  abstract list(): Promise<Campaign[]>;
  abstract get(id: string): Promise<Campaign | undefined>;
  abstract save(input: CampaignSaveInput): Promise<Campaign>;
  /** Launch (approve), pause, resume, end, or send back to draft. Admin only. */
  abstract setStatus(id: string, status: CampaignStatus): Promise<Campaign>;
  abstract remove(id: string): Promise<void>;
  /** Uploads a landing-page image and returns its public URL. */
  abstract upload(file: File): Promise<string>;
  /** Visits vs enquiries for one campaign over the last `days` days (0 = since launch). */
  abstract stats(id: string, days: number): Promise<{ campaign: Campaign; stats: CampaignStats }>;
}

/** The same rules as CAMPAIGN_TRANSITIONS in api/lib/campaigns.php. */
export const CAMPAIGN_TRANSITIONS: Partial<Record<CampaignStatus, CampaignStatus[]>> = {
  in_review: ['active', 'draft'],
  active: ['paused', 'ended'],
  paused: ['active', 'ended']
};

/** A stored campaign → what save.php expects (used when changing one field, e.g. the compliance fix). */
export function toSaveInput(c: Campaign): CampaignSaveInput {
  const landingMode = c.landingMode ?? 'url';
  return {
    id: c.id,
    name: c.name,
    platform: c.platform,
    type: c.type,
    objective: c.objective,
    specialty: c.specialty,
    branch: c.branch,
    status: c.status,
    compliance: c.compliance === 'needs_fix' ? 'needs_fix' : c.compliance === 'passed' ? 'passed' : 'pending',
    dailyBudget: c.dailyBudget,
    startDate: c.startDate,
    endDate: c.endDate || undefined,
    schedule: c.schedule ?? 'desk',
    locationMode: c.locationMode ?? 'cities',
    radiusKm: c.radiusKm ?? undefined,
    locations: c.locations,
    languages: c.languages,
    ageMin: c.ageMin ?? undefined,
    ageMax: c.ageMax ?? undefined,
    keywords: c.keywords,
    headlines: c.headlines,
    descriptions: c.descriptions,
    trackingNumber: c.trackingNumber ?? true,
    whatsappRouting: c.whatsappRouting ?? true,
    conversionId: c.conversionId || undefined,
    landingMode,
    slug: landingMode === 'page' ? c.slug ?? undefined : undefined,
    landingUrl: landingMode === 'url' ? c.landingUrl.split('?')[0] : undefined,
    landingPage: c.landingPage ?? { headline: '', body: [], highlights: [], images: [] },
    phone: c.phone || undefined,
    whatsapp: c.whatsapp || undefined,
    expectedUpdatedAt: c.updatedAt
  };
}

/** Shape of a campaign in api/campaigns/*.php responses. */
type ApiCampaign = Omit<Campaign, 'clientId' | 'spend' | 'impressions' | 'clicks' | 'enquiries' | 'appointments' | 'endDate'> & { endDate: string | null };

@Injectable()
export class HttpCampaignRepository extends CampaignRepository {
  readonly mode = 'api' as const;
  private http = inject(HttpClient);
  private clients = inject(ClientStore);
  private base = `${environment.apiBase}/campaigns`;

  private toCampaign(c: ApiCampaign): Campaign {
    return {
      ...c,
      clientId: this.clients.current().id,
      endDate: c.endDate ?? undefined,
      // Spend, clicks and enquiries arrive with the Google Ads / Meta Ads connection.
      spend: 0,
      impressions: 0,
      clicks: 0,
      enquiries: 0,
      appointments: 0
    };
  }

  async list(): Promise<Campaign[]> {
    const res = await firstValueFrom(this.http.get<{ campaigns: ApiCampaign[] }>(`${this.base}/list.php`));
    return res.campaigns.map((c) => this.toCampaign(c));
  }

  async get(id: string): Promise<Campaign | undefined> {
    const res = await firstValueFrom(this.http.get<{ campaign: ApiCampaign }>(`${this.base}/get.php`, { params: { id } }));
    return this.toCampaign(res.campaign);
  }

  async save(input: CampaignSaveInput): Promise<Campaign> {
    const res = await firstValueFrom(this.http.post<{ campaign: ApiCampaign }>(`${this.base}/save.php`, input));
    return this.toCampaign(res.campaign);
  }

  async setStatus(id: string, status: CampaignStatus): Promise<Campaign> {
    const res = await firstValueFrom(this.http.post<{ campaign: ApiCampaign }>(`${this.base}/status.php`, { id, status }));
    return this.toCampaign(res.campaign);
  }

  async remove(id: string): Promise<void> {
    await firstValueFrom(this.http.post(`${this.base}/delete.php`, { id }));
  }

  async upload(file: File): Promise<string> {
    const body = new FormData();
    body.append('file', file);
    const res = await firstValueFrom(this.http.post<{ url: string }>(`${this.base}/upload.php`, body));
    return res.url;
  }

  async stats(id: string, days: number): Promise<{ campaign: Campaign; stats: CampaignStats }> {
    const res = await firstValueFrom(this.http.get<CampaignStats & { campaign: ApiCampaign }>(`${this.base}/stats.php`, { params: { id, days } }));
    const { campaign, ...stats } = res;
    return { campaign: this.toCampaign(campaign), stats };
  }
}

/** Sample-data mode: campaigns live in the browser (localStorage). */
@Injectable()
export class MockCampaignRepository extends CampaignRepository {
  readonly mode = 'mock' as const;
  private store = inject(CampaignStore);
  private clients = inject(ClientStore);

  async list(): Promise<Campaign[]> {
    return this.store.forClient(this.clients.current().id);
  }

  async get(id: string): Promise<Campaign | undefined> {
    return this.store.get(id);
  }

  async save(input: CampaignSaveInput): Promise<Campaign> {
    const existing = input.id ? this.store.get(input.id) : undefined;
    const site = 'https://' + this.clients.current().website;
    const landingUrl = input.landingMode === 'page' ? `${site}/campaigns/${input.slug}` : input.landingUrl ?? site + '/';
    const utm = `utm_source=${input.platform}&utm_medium=cpc&utm_campaign=${slugify(input.name) || 'campaign'}`;
    return this.store.upsert({
      ...input,
      clientId: existing?.clientId ?? this.clients.current().id,
      endDate: input.endDate,
      landingUrl,
      adUrl: landingUrl + (landingUrl.includes('?') ? '&' : '?') + utm,
      spend: existing?.spend ?? 0,
      impressions: existing?.impressions ?? 0,
      clicks: existing?.clicks ?? 0,
      enquiries: existing?.enquiries ?? 0,
      appointments: existing?.appointments ?? 0,
      updatedAt: new Date().toISOString()
    });
  }

  async setStatus(id: string, status: CampaignStatus): Promise<Campaign> {
    this.store.update(id, { status });
    return this.store.get(id)!;
  }

  async remove(id: string): Promise<void> {
    this.store.remove(id);
  }

  /** No server in sample mode — the image only exists in this browser tab. */
  async upload(file: File): Promise<string> {
    return URL.createObjectURL(file);
  }

  /** Made-up but steady numbers, so the Performance page can be demoed. */
  async stats(id: string, days: number): Promise<{ campaign: Campaign; stats: CampaignStats }> {
    const campaign = this.store.get(id);
    if (!campaign) throw new Error('Campaign not found.');
    const n = days || 30;
    const today = new Date();
    const daily = Array.from({ length: n }, (_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() - (n - 1 - i));
      const visits = 40 + ((i * 37) % 29) + Math.round(i * 0.8);
      return { date: d.toISOString().slice(0, 10), visits, enquiries: Math.round(visits * 0.06), taps: Math.round(visits * 0.03) };
    });
    const sum = (k: 'visits' | 'enquiries' | 'taps') => daily.reduce((a, d) => a + d[k], 0);
    const visits = sum('visits');
    const enquiries = sum('enquiries');
    const rate = (e: number, v: number) => (v ? Math.round((e / v) * 1000) / 10 : null);
    const split = [
      { source: campaign.platform, medium: 'cpc', campaign: slugify(campaign.name), share: 0.78, conv: 1.1 },
      { source: '(direct)', medium: '(none)', campaign: '', share: 0.14, conv: 0.6 },
      { source: 'facebook', medium: 'social', campaign: '', share: 0.08, conv: 0.5 }
    ];
    return {
      campaign,
      stats: {
        from: daily[0].date,
        to: daily[n - 1].date,
        totals: { visits, visitors: Math.round(visits * 0.86), enquiries, taps: sum('taps'), won: Math.round(enquiries * 0.18), conversionRate: rate(enquiries, visits) },
        daily,
        bySource: split.map((s) => {
          const v = Math.round(visits * s.share);
          const e = Math.round(enquiries * s.share * s.conv);
          return { source: s.source, medium: s.medium, campaign: s.campaign, visits: v, enquiries: e, taps: Math.round(e / 2), conversionRate: rate(e, v) };
        }),
        devices: [{ device: 'mobile', visits: Math.round(visits * 0.71) }, { device: 'desktop', visits: Math.round(visits * 0.24) }, { device: 'tablet', visits: Math.round(visits * 0.05) }],
        keywords: campaign.keywords.slice(0, 5).map((term, i) => ({ term, visits: Math.round(visits * 0.2) - i * 7 }))
      }
    };
  }
}

export function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export function provideCampaignRepository() {
  return { provide: CampaignRepository, useClass: environment.dataSource === 'api' ? HttpCampaignRepository : MockCampaignRepository };
}
