import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BlogStore, ClientStore } from '../../core/data/stores';
import { LineChartComponent, LinePoint } from '../../shared/charts/line-chart.component';
import { fmt } from '../../shared/format';

type Metric = 'clicks' | 'impressions';

@Component({
  selector: 'app-seo-page',
  imports: [RouterLink, LineChartComponent],
  template: `
    <div class="page">
      <header class="page-head">
        <div class="titles">
          <div class="title-row"><h1>SEO</h1><span class="sample-badge">Sample data</span></div>
          <div style="display: flex; flex-wrap: wrap; gap: 8px">
            <span class="chip ok"><span class="dot"></span>Search Console</span>
            <span class="chip ok"><span class="dot"></span>Google Analytics 4</span>
            <span class="chip">{{ clients.current().website }}</span>
          </div>
        </div>
        <div class="actions"><a routerLink="/blog/new" class="btn primary">+ New blog post</a></div>
      </header>

      <section class="grid kpis">
        <div class="kpi"><span class="label">Google clicks</span><span class="value">18,240</span><div class="foot"><span class="delta good">▲ 26%</span>last 30 days</div></div>
        <div class="kpi"><span class="label">Times shown on Google</span><span class="value">4.12L</span><div class="foot"><span class="delta good">▲ 19%</span>impressions</div></div>
        <div class="kpi"><span class="label">Average position</span><span class="value">8.4</span><div class="foot"><span class="delta good">↑ 2.1</span>lower is better</div></div>
        <div class="kpi"><span class="label">Enquiries from organic search</span><span class="value">196</span><div class="foot"><span class="delta good">▲ 31%</span>₹0 ad cost</div></div>
      </section>

      <section class="card">
        <div class="card-head">
          <div><h2>Google Search performance</h2><span class="sub">Weekly {{ metric() }} · Search Console</span></div>
          <div class="seg" role="group" aria-label="Metric">
            <button type="button" [class.on]="metric() === 'clicks'" (click)="metric.set('clicks')">Clicks</button>
            <button type="button" [class.on]="metric() === 'impressions'" (click)="metric.set('impressions')">Impressions</button>
          </div>
        </div>
        <adm-line-chart [points]="series()" [unit]="metric()" [height]="240" ariaLabel="Weekly Google Search performance" />
      </section>

      <section class="grid two">
        <div class="card">
          <div class="card-head"><h2>What patients search for</h2><span class="sub">Top search terms</span></div>
          <div class="table-wrap">
            <table class="data" style="min-width: 440px">
              <thead><tr><th>Search term</th><th class="r">Clicks</th><th class="r">CTR</th><th class="r">Position</th></tr></thead>
              <tbody>
                @for (q of queries; track q.term) {
                  <tr><td class="strong">{{ q.term }}</td><td class="r num">{{ fmt(q.clicks) }}</td><td class="r num">{{ q.ctr }}</td><td class="r"><span class="num">{{ q.pos }}</span> <span class="num" style="font-size: 11px; font-weight: 700; color: var(--green-ink)">{{ q.move }}</span></td></tr>
                }
              </tbody>
            </table>
          </div>
        </div>

        <div class="card">
          <div class="card-head"><h2>Pages that bring visits</h2><span class="sub">Organic clicks · 30 days</span></div>
          @for (p of pages; track p.path) {
            <div style="display: grid; grid-template-columns: minmax(0, 1fr) 70px; gap: 10px; align-items: center; font-size: 13px">
              <div style="display: flex; flex-direction: column; gap: 4px; min-width: 0">
                <span class="num" style="font-size: 12px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis">{{ p.path }}</span>
                <div class="track"><i [style.width.%]="p.pct"></i></div>
              </div>
              <span class="num" style="text-align: right; font-weight: 600">{{ fmt(p.clicks) }}</span>
            </div>
          }
        </div>
      </section>

      <section class="grid two">
        <div class="card">
          <div class="card-head"><h2>Blog posts bringing search traffic</h2><a routerLink="/blog" style="font-size: 13px; font-weight: 700">All posts →</a></div>
          @for (p of topPosts(); track p.id; let i = $index) {
            <div style="display: flex; align-items: center; gap: 12px; padding: 8px 0; border-bottom: 1px solid var(--line-soft)">
              <span class="num" style="width: 26px; height: 26px; flex: none; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700" [style.background]="i === 0 ? 'var(--blue)' : 'var(--paper-alt)'" [style.color]="i === 0 ? '#fff' : 'var(--blue)'">{{ i + 1 }}</span>
              <div style="flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px"><b style="font-size: 14px">{{ p.title }}</b><span class="num muted" style="font-size: 11px">/blog/{{ p.slug }}</span></div>
              <div style="display: flex; flex-direction: column; align-items: flex-end; font-size: 12px; color: var(--muted)"><span><b style="color: var(--ink)">{{ fmt(p.clicks30d) }}</b> clicks</span><span><b style="color: var(--ink)">{{ p.leads30d }}</b> leads</span></div>
            </div>
          }
        </div>

        <div class="card">
          <div class="card-head"><h2>Technical health</h2><span class="sub">Checked weekly</span></div>
          @for (t of technical; track t.label) {
            <div style="display: flex; align-items: center; gap: 10px; font-size: 14px; padding: 6px 0">
              <span class="pill" [class]="t.ok ? 'green' : 'amber'" style="min-width: 32px; justify-content: center">{{ t.ok ? '✓' : '!' }}</span>
              <span style="flex: 1">{{ t.label }}</span>
              <span class="muted" style="font-size: 12px">{{ t.detail }}</span>
            </div>
          }
        </div>
      </section>
    </div>
  `
})
export class SeoPage {
  clients = inject(ClientStore);
  private blog = inject(BlogStore);

  metric = signal<Metric>('clicks');

  private readonly weeks = ['14 Jul', '21 Jul', '28 Jul', '4 Aug', '11 Aug', '18 Aug', '25 Aug', '1 Sep', '8 Sep', '15 Sep', '22 Sep', '29 Sep'];
  private readonly clicks = [820, 860, 910, 880, 960, 1010, 990, 1080, 1420, 1510, 1580, 1690];
  private readonly impressions = [21400, 22800, 23100, 22600, 24900, 26200, 25800, 27400, 33900, 35200, 36800, 38100];

  series = computed<LinePoint[]>(() => (this.metric() === 'clicks' ? this.clicks : this.impressions).map((value, i) => ({ label: this.weeks[i], value })));

  readonly queries = [
    { term: 'knee replacement cost hyderabad', clicks: 2140, ctr: '9.8%', pos: '3.1', move: '↑ 4' },
    { term: 'best cardiologist banjara hills', clicks: 1610, ctr: '12.4%', pos: '2.4', move: '↑ 1' },
    { term: 'ivf centre kondapur', clicks: 1180, ctr: '7.9%', pos: '5.6', move: '↑ 3' },
    { term: 'child specialist near me', clicks: 960, ctr: '6.2%', pos: '4.2', move: '↑ 2' },
    { term: 'skin clinic lb nagar', clicks: 720, ctr: '5.1%', pos: '6.8', move: '↑ 5' },
    { term: 'heart check up package price', clicks: 640, ctr: '4.8%', pos: '7.3', move: '↑ 1' }
  ];

  readonly pages = [
    { path: '/blog/knee-replacement-cost-hyderabad', clicks: 2140 },
    { path: '/cardiology', clicks: 1890 },
    { path: '/blog/best-cardiologist-banjara-hills', clicks: 1610 },
    { path: '/ivf-fertility', clicks: 1240 },
    { path: '/doctors', clicks: 1020 },
    { path: '/', clicks: 980 }
  ].map((p) => ({ ...p, pct: Math.round((p.clicks / 2140) * 100) }));

  readonly technical = [
    { label: 'Pages indexed by Google', detail: '146 of 152', ok: true },
    { label: 'Mobile page speed', detail: '91 / 100', ok: true },
    { label: 'Structured data (schema)', detail: 'Hospital, Physician, FAQ', ok: true },
    { label: 'Pages with duplicate titles', detail: '3 doctor pages', ok: false },
    { label: 'Sitemap & robots.txt', detail: 'Updated today', ok: true }
  ];

  topPosts = computed(() =>
    this.blog
      .forClient(this.clients.current().id)
      .filter((p) => p.status === 'published')
      .sort((a, b) => b.clicks30d - a.clicks30d)
      .slice(0, 4)
  );

  fmt = fmt;
}
