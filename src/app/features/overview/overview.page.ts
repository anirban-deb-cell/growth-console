import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CampaignStore, ClientStore } from '../../core/data/stores';
import { IconComponent } from '../../shared/icon.component';
import { fmt, inr } from '../../shared/format';

type Range = '7D' | '30D' | '90D';

@Component({
  selector: 'app-overview-page',
  imports: [RouterLink, IconComponent],
  templateUrl: './overview.page.html',
  styles: `
    .journey { display: flex; flex-direction: column; gap: 10px; }
    .journey .row { display: grid; grid-template-columns: 140px minmax(0, 1fr) 80px; align-items: center; gap: 12px; }
    .journey .row > span:first-child { font-size: 13px; font-weight: 600; color: var(--ink-2); }
    .journey .bar { height: 30px; background: var(--paper-alt); border-radius: 8px; display: flex; overflow: hidden; }
    .journey .bar i { display: block; border-radius: 8px; }
    .journey .step { display: grid; grid-template-columns: 140px minmax(0, 1fr); gap: 12px; margin-top: -4px; font-size: 12px; color: var(--muted); }
    .weeks { display: flex; align-items: flex-end; gap: 8px; height: 200px; border-bottom: 1px solid var(--line); padding-top: 10px; }
    .weeks div { flex: 1; min-width: 0; display: flex; flex-direction: column; align-items: center; gap: 6px; justify-content: flex-end; height: 100%; font-size: 11px; color: var(--muted); }
    .weeks i { display: block; width: 100%; max-width: 36px; border-radius: 6px 6px 2px 2px; }
    .stack { display: flex; height: 14px; border-radius: 99px; overflow: hidden; gap: 2px; }
    .stack i { display: block; height: 100%; }
    .legend-row { display: flex; align-items: center; gap: 10px; font-size: 13px; }
    .legend-row .sw { width: 10px; height: 10px; border-radius: 3px; flex: none; }
    .legend-row .name { flex: 1; font-weight: 600; }
    .lead-row { display: flex; align-items: center; gap: 12px; padding: 8px 0; border-bottom: 1px solid var(--line-soft); }
    .lead-row .ch { width: 36px; height: 36px; flex: none; border-radius: 99px; background: var(--blue-bg); color: var(--blue); display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 800; }
    .lead-row div { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; font-size: 14px; font-weight: 700; }
    .lead-row small { font-size: 12px; color: var(--muted); font-weight: 500; }
    .checks { margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 8px; font-size: 13px; }
    .checks li { display: flex; gap: 8px; }
    .stars { font-size: 18px; color: #A86F00; letter-spacing: 2px; }
  `
})
export class OverviewPage {
  clients = inject(ClientStore);
  private campaigns = inject(CampaignStore);

  readonly ranges: Range[] = ['7D', '30D', '90D'];
  range = signal<Range>('30D');
  branch = signal('All');

  client = this.clients.current;
  branchOptions = computed(() => ['All', ...this.client().branches]);
  rangeLabel = computed(() => ({ '7D': 'Last 7 days', '30D': 'Last 30 days', '90D': 'Last 90 days' })[this.range()]);

  readonly kpis = [
    { label: 'Patient enquiries', value: '1,284', delta: '▲ 18%', tone: 'good', note: 'calls, WhatsApp, forms' },
    { label: 'Cost per enquiry', value: '₹412', delta: '▼ 9%', tone: 'good', note: 'cheaper is better' },
    { label: 'Appointments booked', value: '486', delta: '▲ 12%', tone: 'good', note: 'from enquiries' },
    { label: 'Enquiry → appointment', value: '37.9%', delta: '▲ 2.1 pts', tone: 'good', note: 'front-desk conversion' },
    { label: 'Median response time', value: '6m 40s', delta: 'Target 5m', tone: 'warn', note: 'evenings slowest' }
  ];

  readonly journey = [
    { label: 'Ad impressions', width: 100, fill: '#C9D8F5', value: '1.92M', step: '↓ 2.0% clicked' },
    { label: 'Clicks & visits', width: 78, fill: '#9DB8EC', value: '38,400', step: '↓ 3.3% became enquiries' },
    { label: 'Patient enquiries', width: 56, fill: '#6B93DF', value: '1,284', step: '↓ 37.9% booked' },
    { label: 'Appointments', width: 36, fill: '#3C6FD0', value: '486', step: '↓ 82.5% showed up' },
    { label: 'Patients visited', width: 30, fill: '#1550C4', value: '401', step: '' }
  ];

  readonly weeks = [240, 256, 231, 268, 279, 262, 295, 288, 301, 310, 322, 351].map((v, i) => ({ v, h: Math.round((v / 351) * 140), fill: i >= 8 ? '#1550C4' : '#C9D8F5' }));

  readonly sources = [
    { name: 'Google Search', n: 512, cpl: '₹438', color: '#1550C4', pct: 40 },
    { name: 'Meta (Facebook / Instagram)', n: 341, cpl: '₹322', color: '#0B7A55', pct: 27 },
    { name: 'Organic / SEO', n: 196, cpl: '—', color: '#7FC7A8', pct: 15 },
    { name: 'WhatsApp direct', n: 142, cpl: '—', color: '#D9A13B', pct: 11 },
    { name: 'Health directories', n: 93, cpl: '₹510', color: '#8A94A6', pct: 7 }
  ];

  readonly channels = [
    { name: 'Phone calls', n: '591 · 46%', pct: 46, color: '#1550C4' },
    { name: 'WhatsApp chats', n: '398 · 31%', pct: 31, color: '#0B7A55' },
    { name: 'Web forms', n: '295 · 23%', pct: 23, color: '#D9A13B' }
  ];

  readonly latest = [
    { ch: 'Call', who: 'R•••• K. · Cardiology', meta: 'Google Search · 4 min ago', status: 'New' },
    { ch: 'WA', who: 'S•••• M. · IVF & Fertility', meta: 'WhatsApp ad · 11 min ago', status: 'New' },
    { ch: 'Form', who: 'A•••• P. · Dermatology', meta: 'Instagram · 26 min ago', status: 'Contacted' },
    { ch: 'Call', who: 'V•••• R. · Orthopedics', meta: 'Organic search · 48 min ago', status: 'Booked' }
  ];

  /** Grouped from this client's campaigns, so it always matches the campaign list. */
  specialties = computed(() => {
    const rows = new Map<string, { spend: number; enquiries: number; appointments: number }>();
    for (const c of this.campaigns.forClient(this.client().id)) {
      const r = rows.get(c.specialty) ?? { spend: 0, enquiries: 0, appointments: 0 };
      r.spend += c.spend;
      r.enquiries += c.enquiries;
      r.appointments += c.appointments;
      rows.set(c.specialty, r);
    }
    return [...rows.entries()]
      .filter(([, r]) => r.spend > 0)
      .map(([name, r]) => {
        const cpl = r.enquiries ? r.spend / r.enquiries : 0;
        const conv = r.enquiries ? (r.appointments / r.enquiries) * 100 : 0;
        return { name, spend: inr(r.spend), enquiries: fmt(r.enquiries), cpl: inr(cpl), conv: Math.round(conv), costly: cpl > 600 };
      })
      .sort((a, b) => b.conv - a.conv);
  });
}
