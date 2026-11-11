import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { apiMessage } from '../../core/auth/auth.service';
import { Campaign, CampaignStats } from '../../core/data/models';
import { LineChartComponent, LinePoint } from '../../shared/charts/line-chart.component';
import { BarSeries, StackedBarChartComponent, StackedBarPoint } from '../../shared/charts/stacked-bar-chart.component';
import { fmt, shortDate } from '../../shared/format';
import { CampaignRepository } from './campaign-repository';
import { STATUS_LABEL, STATUS_TONE } from './campaign-list.page';

const RANGES = [
  { days: 7, label: '7 days' },
  { days: 30, label: '30 days' },
  { days: 90, label: '90 days' },
  { days: 0, label: 'Since launch' }
];

/**
 * /campaigns/:id/performance — does this campaign convert? Landing-page
 * visits (with their tracking tags) against the enquiries they produced:
 * totals, per day, and per traffic source (utm_source / medium / campaign).
 */
@Component({
  selector: 'app-campaign-performance-page',
  imports: [RouterLink, LineChartComponent, StackedBarChartComponent],
  template: `
    <div class="page">
      <header class="page-head">
        <div class="titles">
          <a routerLink="/campaigns" class="back-link">← All campaigns</a>
          <div class="title-row">
            <h1>{{ campaign()?.name ?? 'Campaign performance' }}</h1>
            @if (campaign(); as c) { <span class="pill" [class]="statusTone[c.status]">{{ statusLabel[c.status] }}</span> }
            @if (isMock) { <span class="sample-badge">Sample data</span> }
          </div>
          @if (campaign(); as c) {
            <p>Visits to <a [href]="c.landingUrl" target="_blank" rel="noopener" class="mono">{{ path(c.landingUrl) }} ↗</a> and the enquiries they turned into{{ stats() ? ' · ' + shortDate(stats()!.from) + ' – ' + shortDate(stats()!.to) : '' }}</p>
          }
        </div>
        <div class="actions">
          <div class="seg" role="group" aria-label="Date range">
            @for (r of ranges; track r.days) {
              <button type="button" [class.on]="days() === r.days" (click)="setRange(r.days)">{{ r.label }}</button>
            }
          </div>
        </div>
      </header>

      @if (error()) {
        <div class="alert danger" role="alert"><div class="body"><strong>Couldn’t load the numbers</strong><span>{{ error() }}</span></div><button type="button" class="btn" (click)="load()">Try again</button></div>
      }

      @if (stats(); as s) {
        <section class="grid kpis" aria-label="Totals">
          <div class="kpi"><span class="label">Visits</span><span class="value">{{ fmt(s.totals.visits) }}</span><div class="foot">{{ fmt(s.totals.visitors) }} unique visitors</div></div>
          <div class="kpi"><span class="label">Form enquiries</span><span class="value">{{ fmt(s.totals.enquiries) }}</span><div class="foot">{{ s.totals.won }} won</div></div>
          <div class="kpi"><span class="label">Conversion rate</span><span class="value">{{ pct(s.totals.conversionRate) }}</span><div class="foot">enquiries ÷ visits</div></div>
          <div class="kpi"><span class="label">Call &amp; WhatsApp taps</span><span class="value">{{ fmt(s.totals.taps) }}</span><div class="foot">{{ pct(tapRate()) }} of visits</div></div>
        </section>

        @if (!s.totals.visits && !s.totals.enquiries) {
          <div class="card muted empty">
            No visits in this period yet. Visits are counted when someone opens the landing page
            @if (campaign()?.landingMode !== 'page') { — this campaign sends people to an existing page, so only enquiries are tracked here }.
            Share the link from “Copy ad link” on the campaign list so every visit carries its tracking tags.
          </div>
        } @else {
          <section class="grid two">
            <div class="card">
              <div class="card-head"><h2>Visits per day</h2><span class="sub">Landing page opens</span></div>
              <adm-line-chart [points]="visitPoints()" unit="visits" [height]="220" ariaLabel="Landing page visits per day" />
            </div>
            <div class="card">
              <div class="card-head"><h2>Enquiries per day</h2><span class="sub">Form enquiries and Call / WhatsApp taps</span></div>
              <adm-stacked-bar-chart [data]="enquiryBars()" [series]="enquirySeries" [height]="220" ariaLabel="Enquiries per day" />
            </div>
          </section>

          <section class="card">
            <div class="card-head"><h2>By traffic source</h2><span class="sub">From the link’s tracking tags (utm_source / utm_medium / utm_campaign)</span></div>
            <div class="table-wrap">
              <table class="data" style="min-width: 760px">
                <thead><tr><th>Source / medium</th><th>Campaign tag</th><th class="r">Visits</th><th class="r">Enquiries</th><th class="r">Taps</th><th class="r">Conversion</th><th style="width: 22%"><span class="sr-only">Share of visits</span></th></tr></thead>
                <tbody>
                  @for (r of s.bySource; track r.source + r.medium + r.campaign) {
                    <tr>
                      <td><b>{{ r.source }}</b> <span class="muted">/ {{ r.medium }}</span></td>
                      <td class="mono small">{{ r.campaign || '—' }}</td>
                      <td class="r num">{{ fmt(r.visits) }}</td>
                      <td class="r num">{{ fmt(r.enquiries) }}</td>
                      <td class="r num">{{ fmt(r.taps) }}</td>
                      <td class="r num"><b>{{ pct(r.conversionRate) }}</b></td>
                      <td><div class="track"><i [style.width.%]="share(r.visits, s.totals.visits)"></i></div></td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </section>

          <section class="grid two">
            <div class="card">
              <div class="card-head"><h2>Devices</h2><span class="sub">Visits</span></div>
              @for (d of s.devices; track d.device) {
                <div class="bar-row"><span class="cap">{{ d.device }}</span><div class="track"><i [style.width.%]="share(d.visits, s.totals.visits)"></i></div><span class="num">{{ pct(share(d.visits, s.totals.visits), 0) }}</span></div>
              }
            </div>
            <div class="card">
              <div class="card-head"><h2>Search keywords</h2><span class="sub">utm_term · visits</span></div>
              @for (k of s.keywords; track k.term) {
                <div class="bar-row"><span class="kw">{{ k.term }}</span><span class="num">{{ fmt(k.visits) }}</span></div>
              } @empty {
                <span class="muted small">No keywords yet. Google Ads adds them when the ad’s final URL suffix includes <code>utm_term=&#123;keyword&#125;</code>.</span>
              }
            </div>
          </section>

          <div class="foot-links">
            <a [routerLink]="['/enquiries']" [queryParams]="{ campaign: id() }">See this campaign’s enquiries →</a>
          </div>
        }
      } @else if (loading()) {
        <div class="card muted">Loading…</div>
      }
    </div>
  `,
  styles: `
    .mono { font-family: var(--mono); }
    .small { font-size: 12px; }
    .empty { line-height: 1.6; }
    .track { height: 8px; border-radius: 99px; background: var(--paper-alt); overflow: hidden; }
    .track i { display: block; height: 100%; background: var(--blue); border-radius: 99px; }
    .bar-row { display: grid; grid-template-columns: 90px 1fr 48px; gap: 10px; align-items: center; font-size: 13px; padding: 6px 0; }
    .bar-row:has(.kw) { grid-template-columns: 1fr auto; border-bottom: 1px solid var(--line-soft); }
    .bar-row .cap { text-transform: capitalize; font-weight: 600; }
    .bar-row .num { text-align: right; }
    .foot-links { display: flex; justify-content: flex-end; }
    .foot-links a { font-weight: 700; font-size: 14px; }
  `
})
export class CampaignPerformancePage implements OnInit {
  private repo = inject(CampaignRepository);
  readonly isMock = this.repo.mode === 'mock';

  /** Route param (component input binding). */
  id = input.required<string>();

  readonly ranges = RANGES;
  readonly statusLabel = STATUS_LABEL;
  readonly statusTone = STATUS_TONE;
  readonly enquirySeries: BarSeries[] = [
    { name: 'Form enquiries', color: 'var(--blue)' },
    { name: 'Call / WhatsApp taps', color: 'var(--mint)' }
  ];

  days = signal(30);
  campaign = signal<Campaign | null>(null);
  stats = signal<CampaignStats | null>(null);
  loading = signal(true);
  error = signal('');

  visitPoints = computed<LinePoint[]>(() => (this.stats()?.daily ?? []).map((d) => ({ label: shortDate(d.date).replace(/ \d{4}$/, ''), value: d.visits })));
  enquiryBars = computed<StackedBarPoint[]>(() => (this.stats()?.daily ?? []).map((d) => ({ label: shortDate(d.date).replace(/ \d{4}$/, ''), values: [d.enquiries, d.taps] })));
  tapRate = computed(() => {
    const t = this.stats()?.totals;
    return t && t.visits ? Math.round((t.taps / t.visits) * 1000) / 10 : null;
  });

  ngOnInit(): void {
    this.load();
  }

  setRange(days: number): void {
    if (days === this.days()) return;
    this.days.set(days);
    this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    try {
      const res = await this.repo.stats(this.id(), this.days());
      this.campaign.set(res.campaign);
      this.stats.set(res.stats);
    } catch (err) {
      this.error.set(apiMessage(err, 'Couldn’t load this campaign’s numbers.'));
    } finally {
      this.loading.set(false);
    }
  }

  fmt = fmt;
  shortDate = shortDate;

  pct(value: number | null, digits = 1): string {
    return value === null ? '—' : value.toFixed(digits) + '%';
  }

  share(part: number, total: number): number {
    return total ? Math.round((part / total) * 1000) / 10 : 0;
  }

  path(url: string): string {
    try {
      return new URL(url).pathname;
    } catch {
      return url;
    }
  }
}
