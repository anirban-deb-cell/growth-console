import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService, apiMessage } from '../../core/auth/auth.service';
import { campaignAudience } from '../../core/data/audience';
import { Campaign, CampaignStatus, ComplianceState, Platform } from '../../core/data/models';
import { ClientStore, ToastService } from '../../core/data/stores';
import { CAMPAIGN_TRANSITIONS, CampaignRepository, toSaveInput } from './campaign-repository';
import { LineChartComponent, LinePoint } from '../../shared/charts/line-chart.component';
import { checkCompliance, suggestRewrite } from '../../shared/compliance';
import { fmt, inr, shortDate } from '../../shared/format';

type PlatformFilter = 'all' | Platform;
type StatusFilter = 'all' | CampaignStatus;

export const STATUS_LABEL: Record<CampaignStatus, string> = { active: 'Active', paused: 'Paused', draft: 'Draft', in_review: 'In review', ended: 'Ended' };
export const STATUS_TONE: Record<CampaignStatus, string> = { active: 'green', paused: 'grey', draft: 'grey', in_review: 'amber', ended: 'grey' };
export const COMPLIANCE_LABEL: Record<ComplianceState, string> = { passed: 'Passed', needs_fix: 'Needs fix', check_images: 'Check images', pending: 'Checking…' };
export const COMPLIANCE_TONE: Record<ComplianceState, string> = { passed: 'green', needs_fix: 'red', check_images: 'amber', pending: 'blue' };

@Component({
  selector: 'app-campaign-list-page',
  imports: [RouterLink, LineChartComponent],
  templateUrl: './campaign-list.page.html',
  styles: `
    .filters { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; justify-content: space-between; }
    .filters .right { display: flex; gap: 10px; flex-wrap: wrap; }
    .filters select, .filters input { border: 1px solid var(--line-strong); border-radius: 10px; padding: 0 12px; min-height: 40px; font-size: 13px; font-weight: 600; color: var(--ink); background: #fff; }
    .filters input { min-width: 220px; }
    .camp { display: flex; align-items: center; gap: 10px; }
    .camp .pf { width: 32px; height: 32px; flex: none; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 800; }
    .camp .pf.google { background: var(--blue-bg); color: var(--blue-deep); }
    .camp .pf.meta { background: var(--green-bg); color: var(--green-ink); }
    .camp div { display: flex; flex-direction: column; gap: 2px; }
    .camp small { font-size: 12px; color: var(--muted); }
    .ad { border-radius: 12px; padding: 16px; display: flex; flex-direction: column; gap: 8px; }
    .ad.bad { border: 1px solid #F6C9C3; background: #FFF8F7; }
    .ad.good { border: 1px solid #BFE0D2; background: #F5FBF8; }
    .ad .tag { font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: .06em; }
    .ad .headline { font-size: 16px; font-weight: 700; color: #1A0DAB; }
    .ad .desc { font-size: 14px; color: var(--ink-2); line-height: 1.5; }
    .ad .flag { background: #F9D4CF; color: #7A1A10; padding: 0 3px; border-radius: 4px; }
    .ad ul { margin: 4px 0 0; padding-left: 18px; font-size: 13px; color: #7A1A10; line-height: 1.5; }
    .pacing { display: flex; flex-direction: column; gap: 6px; font-size: 13px; }
    .pacing div:first-child { display: flex; justify-content: space-between; gap: 10px; }
    .camp .lp { font-family: var(--mono); font-size: 11px; }
    .camp .camp-name { font-weight: 800; color: var(--ink); }
    .camp .camp-name:hover { color: var(--blue); text-decoration: underline; }
    .row-actions { white-space: nowrap; display: flex; gap: 6px; justify-content: flex-end; flex-wrap: wrap; }
  `
})
export class CampaignListPage implements OnInit {
  private repo = inject(CampaignRepository);
  private auth = inject(AuthService);
  clients = inject(ClientStore);
  private toast = inject(ToastService);
  readonly isMock = this.repo.mode === 'mock';
  readonly isAdmin = computed(() => this.auth.user()?.role === 'admin');
  /** Hospital (Specialty, branches) or agency (Service) wording. */
  readonly audience = computed(() => campaignAudience(this.clients.current()));

  private all = signal<Campaign[]>([]);
  loading = signal(true);
  error = signal('');
  /** Campaign id whose status change / save is in progress. */
  busyId = signal<string | null>(null);

  platform = signal<PlatformFilter>('all');
  status = signal<StatusFilter>('all');
  specialty = signal('all');
  query = signal('');
  fixingId = signal<string | null>(null);

  readonly statusLabel = STATUS_LABEL;
  readonly statusTone = STATUS_TONE;
  readonly complianceLabel = COMPLIANCE_LABEL;
  readonly complianceTone = COMPLIANCE_TONE;
  readonly statusTabs: StatusFilter[] = ['all', 'active', 'paused', 'in_review', 'draft', 'ended'];

  clientCampaigns = computed(() => this.all());

  ngOnInit(): void {
    this.load();
  }

  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set('');
    try {
      this.all.set(await this.repo.list());
    } catch (err) {
      this.error.set(apiMessage(err));
    } finally {
      this.loading.set(false);
    }
  }

  private replace(updated: Campaign): void {
    this.all.update((list) => list.map((c) => (c.id === updated.id ? updated : c)));
  }

  /** Live / waiting counts for the API view (performance numbers need the Ads APIs). */
  pipeline = computed(() => {
    const list = this.clientCampaigns();
    const n = (s: CampaignStatus) => list.filter((c) => c.status === s).length;
    return {
      active: n('active'),
      paused: n('paused'),
      review: n('in_review'),
      draft: n('draft'),
      dailyLive: inr(list.filter((c) => c.status === 'active').reduce((a, c) => a + c.dailyBudget, 0)),
      leads: list.reduce((a, c) => a + (c.leadCount ?? 0), 0),
      newLeads: list.reduce((a, c) => a + (c.newLeadCount ?? 0), 0)
    };
  });
  specialties = computed(() => [...new Set(this.clientCampaigns().map((c) => c.specialty))].sort());

  private byPlatform = computed(() => this.clientCampaigns().filter((c) => this.platform() === 'all' || c.platform === this.platform()));

  statusCounts = computed(() => {
    const counts: Partial<Record<StatusFilter, number>> = { all: this.byPlatform().length };
    for (const c of this.byPlatform()) counts[c.status] = (counts[c.status] ?? 0) + 1;
    return counts;
  });

  rows = computed(() => {
    const q = this.query().trim().toLowerCase();
    return this.byPlatform().filter(
      (c) =>
        (this.status() === 'all' || c.status === this.status()) &&
        (this.specialty() === 'all' || c.specialty === this.specialty()) &&
        (!q || c.name.toLowerCase().includes(q) || c.specialty.toLowerCase().includes(q))
    );
  });

  totals = computed(() => {
    const list = this.rows();
    const spend = list.reduce((a, c) => a + c.spend, 0);
    const clicks = list.reduce((a, c) => a + c.clicks, 0);
    const impressions = list.reduce((a, c) => a + c.impressions, 0);
    const enquiries = list.reduce((a, c) => a + c.enquiries, 0);
    const appointments = list.reduce((a, c) => a + c.appointments, 0);
    const daily = list.filter((c) => c.status === 'active').reduce((a, c) => a + c.dailyBudget, 0);
    return {
      spend: inr(spend),
      budget: inr(daily * 30.4),
      clicks: fmt(clicks),
      ctr: impressions ? ((clicks / impressions) * 100).toFixed(1) + '%' : '—',
      enquiries: fmt(enquiries),
      cpl: enquiries ? inr(spend / enquiries) : '—',
      appointments: fmt(appointments),
      conv: enquiries ? ((appointments / enquiries) * 100).toFixed(1) + '%' : '—'
    };
  });

  /** 30 days of sample daily enquiries, scaled to the filtered campaigns' total. */
  chart = computed<LinePoint[]>(() => {
    const total = this.rows().reduce((a, c) => a + c.enquiries, 0);
    const shape = [18, 22, 19, 24, 26, 23, 21, 25, 27, 26, 29, 28, 24, 27, 30, 31, 29, 33, 32, 30, 34, 33, 35, 32, 36, 38, 35, 37, 39, 41];
    const sum = shape.reduce((a, v) => a + v, 0);
    return shape.map((v, i) => ({ label: shortDate(`2026-${i < 22 ? '09' : '10'}-${String(i < 22 ? i + 9 : i - 21).padStart(2, '0')}`).replace(' 2026', ''), value: Math.round((v / sum) * total) }));
  });

  pacing = computed(() =>
    this.clientCampaigns()
      .filter((c) => c.status === 'active')
      .slice(0, 5)
      .map((c) => {
        const monthly = c.dailyBudget * 30.4;
        const pct = Math.min(100, Math.round((c.spend / monthly) * 100));
        return { name: c.name, text: `${inr(c.spend)} / ${inr(monthly)}`, pct, warn: pct >= 98 };
      })
  );

  fixing = computed<Campaign | undefined>(() => {
    const id = this.fixingId();
    const list = this.clientCampaigns();
    return id ? list.find((c) => c.id === id) : list.find((c) => c.compliance === 'needs_fix');
  });

  /** Landing page lines the check reads (campaign pages only). */
  landingLines = computed(() => {
    const c = this.fixing();
    const lp = c?.landingMode === 'page' ? c.landingPage : undefined;
    return lp ? [lp.headline, lp.subheadline ?? '', lp.offer ?? '', ...lp.highlights, ...lp.body].filter((t) => t.trim()) : [];
  });

  findings = computed(() => {
    const c = this.fixing();
    return c ? checkCompliance([...c.headlines, ...c.descriptions, ...this.landingLines()].join(' ')) : [];
  });

  /** Landing page lines that contain a flagged phrase, for the "current" column. */
  flaggedLandingLines = computed(() => this.landingLines().filter((t) => checkCompliance(t).length));

  rewrite = computed(() => {
    const c = this.fixing();
    if (!c) return null;
    const lp = c.landingPage;
    return {
      headlines: c.headlines.map(suggestRewrite),
      descriptions: c.descriptions.map(suggestRewrite),
      landingPage: lp && {
        ...lp,
        headline: suggestRewrite(lp.headline),
        subheadline: lp.subheadline ? suggestRewrite(lp.subheadline) : lp.subheadline,
        offer: lp.offer ? suggestRewrite(lp.offer) : lp.offer,
        highlights: lp.highlights.map(suggestRewrite),
        body: lp.body.map(suggestRewrite)
      }
    };
  });

  /** Rewritten landing page lines that changed, for the "suggested" column. */
  rewrittenLandingLines = computed(() => this.flaggedLandingLines().map(suggestRewrite));

  fmt = fmt;
  inr = inr;
  shortDate = shortDate;

  /** Form enquiries ÷ landing-page visits, since launch. */
  conversion(c: Campaign): string {
    return c.visitCount ? ((100 * (c.leadCount ?? 0)) / c.visitCount).toFixed(1) + '%' : '—';
  }

  cpl(c: Campaign): string {
    return c.enquiries ? inr(c.spend / c.enquiries) : '—';
  }

  /** Status buttons this campaign offers (admins only — same rules as the API). */
  transitions(c: Campaign): { to: CampaignStatus; label: string; primary?: boolean }[] {
    if (!this.isAdmin()) return [];
    const labels: Partial<Record<CampaignStatus, string>> = {
      active: c.status === 'in_review' ? 'Approve & launch' : 'Resume',
      paused: 'Pause',
      ended: 'End',
      draft: 'Send back'
    };
    return (CAMPAIGN_TRANSITIONS[c.status] ?? []).map((to) => ({ to, label: labels[to] ?? to, primary: to === 'active' && c.status === 'in_review' }));
  }

  /** The landing page is on the website only once the campaign is live; an existing page always is. */
  canView(c: Campaign): boolean {
    return !!c.landingUrl && (c.landingMode === 'url' || c.status === 'active' || c.status === 'paused');
  }

  canEdit(c: Campaign): boolean {
    return c.status !== 'ended' && (this.isAdmin() || c.status === 'draft' || c.status === 'in_review');
  }

  canDelete(c: Campaign): boolean {
    return c.status !== 'active' && c.status !== 'paused' && (this.isAdmin() || c.status === 'draft' || c.status === 'in_review');
  }

  async changeStatus(c: Campaign, to: CampaignStatus): Promise<void> {
    if (to === 'ended' && !confirm(`End “${c.name}”? An ended campaign can’t be restarted.`)) return;
    this.busyId.set(c.id);
    try {
      this.replace(await this.repo.setStatus(c.id, to));
      const done: Partial<Record<CampaignStatus, string>> = { active: c.status === 'in_review' ? 'approved and launched' : 'resumed', paused: 'paused', ended: 'ended', draft: 'sent back to draft' };
      this.toast.show(`${c.name} ${done[to] ?? 'updated'}`);
    } catch (err) {
      this.toast.show(apiMessage(err, 'Couldn’t change the campaign.'));
    } finally {
      this.busyId.set(null);
    }
  }

  async remove(c: Campaign): Promise<void> {
    if (!confirm(`Delete “${c.name}”? This can’t be undone.`)) return;
    this.busyId.set(c.id);
    try {
      await this.repo.remove(c.id);
      this.all.update((list) => list.filter((x) => x.id !== c.id));
      this.toast.show('Campaign deleted');
    } catch (err) {
      this.toast.show(apiMessage(err, 'Couldn’t delete the campaign.'));
    } finally {
      this.busyId.set(null);
    }
  }

  async copyAdLink(c: Campaign): Promise<void> {
    try {
      await navigator.clipboard.writeText(c.adUrl ?? c.landingUrl);
      this.toast.show('Ad link copied — paste it as the final URL in Google Ads / Meta');
    } catch {
      this.toast.show(c.adUrl ?? c.landingUrl);
    }
  }

  /** "/campaigns/knee-replacement" or the page's path on the site. */
  landingPath(c: Campaign): string {
    try {
      return new URL(c.landingUrl).pathname;
    } catch {
      return c.landingUrl;
    }
  }

  review(c: Campaign): void {
    this.fixingId.set(c.id);
    document.getElementById('compliance')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  async approveFix(): Promise<void> {
    const c = this.fixing();
    const r = this.rewrite();
    if (!c || !r) return;
    this.busyId.set(c.id);
    try {
      const input = toSaveInput(c);
      this.replace(await this.repo.save({ ...input, headlines: r.headlines, descriptions: r.descriptions, landingPage: r.landingPage ?? input.landingPage, compliance: 'passed' }));
      this.toast.show('Ad copy updated' + (c.status === 'active' ? ' · update it in the ad platform too' : ''));
    } catch (err) {
      this.toast.show(apiMessage(err, 'Couldn’t update the ad copy.'));
    } finally {
      this.busyId.set(null);
    }
  }

  /** Splits text so flagged phrases can be highlighted without innerHTML. */
  highlight(text: string): { t: string; flag: boolean }[] {
    const phrases = checkCompliance(text).map((f) => f.phrase);
    if (!phrases.length) return [{ t: text, flag: false }];
    const re = new RegExp(`(${phrases.map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi');
    return text.split(re).filter(Boolean).map((t) => ({ t, flag: phrases.some((p) => p.toLowerCase() === t.toLowerCase()) }));
  }
}
