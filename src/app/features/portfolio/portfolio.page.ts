import { Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ClientStore } from '../../core/data/stores';
import { IconComponent } from '../../shared/icon.component';
import { fmt, inr } from '../../shared/format';

type Range = '7D' | '30D' | '90D';

@Component({
  selector: 'app-portfolio-page',
  imports: [IconComponent],
  templateUrl: './portfolio.page.html',
  styles: `
    .client-cell { display: flex; align-items: center; gap: 10px; }
    .client-cell .mark { width: 34px; height: 34px; flex: none; border-radius: 9px; background: var(--blue-bg); color: var(--blue); display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 800; }
    .client-cell div { display: flex; flex-direction: column; gap: 2px; }
    .client-cell small { font-size: 12px; color: var(--muted); }
    .modules { font-size: 12px; color: var(--ink-2); }
    .search { display: flex; align-items: center; gap: 8px; border: 1px solid var(--line-strong); border-radius: 10px; padding: 0 12px; min-height: 44px; background: #fff; color: var(--muted); }
    .search input { border: 0; outline: none; font-size: 13px; font-weight: 600; color: var(--ink); width: 200px; background: transparent; }
    .report-row { display: flex; align-items: center; gap: 12px; padding: 10px 0; border-bottom: 1px solid var(--line-soft); font-size: 14px; font-weight: 600; }
    .report-row:last-child { border-bottom: 0; }
    .report-row span:first-child { flex: 1; }
    .brand-card p { margin: 0; font-size: 14px; color: #C3CFE0; line-height: 1.55; }
    .brand-card .chips { display: flex; flex-wrap: wrap; gap: 8px; }
    .brand-card .chips span { font-size: 12px; font-weight: 700; padding: 6px 10px; border-radius: 99px; background: var(--navy-raised); }
    .brand-card .chips span.new { background: var(--mint); color: var(--navy); }
    .integration { display: flex; flex-direction: column; gap: 6px; font-size: 13px; }
    .integration div:first-child { display: flex; justify-content: space-between; }
  `
})
export class PortfolioPage {
  private clientStore = inject(ClientStore);
  private router = inject(Router);

  readonly ranges: Range[] = ['7D', '30D', '90D'];
  range = signal<Range>('30D');
  query = signal('');

  rangeLabel = computed(() => ({ '7D': 'Last 7 days', '30D': 'Last 30 days', '90D': 'Last 90 days' })[this.range()]);

  clients = computed(() => {
    const q = this.query().trim().toLowerCase();
    return this.clientStore.clients().filter((c) => !q || c.name.toLowerCase().includes(q) || c.city.toLowerCase().includes(q));
  });

  readonly moduleNames: Record<string, string> = { overview: '', campaigns: 'Ads', seo: 'SEO', blog: 'Blog', reputation: 'Reputation', global: 'Global' };

  readonly integrations = [
    ['Google Search Console', 8], ['Google Analytics 4', 8], ['Google Business Profile', 7],
    ['Google Ads', 6], ['Meta Ads', 6], ['WhatsApp Business', 4]
  ].map(([name, count]) => ({ name: name as string, count: count as number, pct: Math.round(((count as number) / 8) * 100) }));

  fmt = fmt;
  inr = inr;

  modulesOf(modules: string[]): string {
    return modules.map((m) => this.moduleNames[m]).filter(Boolean).join(' · ');
  }

  open(clientId: string): void {
    this.clientStore.select(clientId);
    this.router.navigateByUrl('/overview');
  }

  openCampaigns(clientId: string): void {
    this.clientStore.select(clientId);
    this.router.navigateByUrl('/campaigns');
  }
}
