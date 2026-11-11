import { Component, OnInit, computed, inject, input, signal } from '@angular/core';
import { AuthService, apiMessage } from '../../core/auth/auth.service';
import { campaignAudience } from '../../core/data/audience';
import { Lead, LeadChannel, LeadStatus } from '../../core/data/models';
import { ClientStore, ToastService } from '../../core/data/stores';
import { LeadRepository } from './lead-repository';

type StatusFilter = 'all' | LeadStatus;
type ChannelFilter = 'form' | 'taps' | 'all';

const STATUS_LABEL: Record<LeadStatus, string> = { new: 'New', contacted: 'Contacted', qualified: 'Qualified', won: 'Won', lost: 'Lost' };
const STATUS_TONE: Record<LeadStatus, string> = { new: 'blue', contacted: 'amber', qualified: 'amber', won: 'green', lost: 'grey' };
const CHANNEL_LABEL: Record<LeadChannel, string> = { form: 'Enquiry form', call: 'Tapped Call', whatsapp: 'Tapped WhatsApp' };

/**
 * Enquiries inbox: every lead from the website — campaign landing pages and
 * the Contact Us form — worked through new → contacted → qualified → won /
 * lost, with the team's notes. /enquiries?campaign=12 opens it filtered to
 * one campaign; ?campaign=contact to the Contact Us form; ?campaign=blog or
 * ?campaign=blog:7 to enquiries from people who read the blog / one post.
 */
@Component({
  selector: 'app-enquiries-page',
  imports: [],
  template: `
    <div class="page">
      <header class="page-head">
        <div class="titles">
          <div class="title-row"><h1>Enquiries</h1>@if (isMock) { <span class="sample-badge">Sample data</span> }</div>
          <p>Every enquiry from {{ clients.current().website }} — the Contact Us page and your campaign landing pages. Call back new enquiries the same day — speed wins {{ audience().agency ? 'deals' : 'patients' }}.</p>
        </div>
        <div class="actions"><button type="button" class="btn" [disabled]="!visible().length" (click)="downloadCsv()">Download CSV</button></div>
      </header>

      @if (error()) {
        <div class="alert danger" role="alert"><div class="body"><strong>Couldn’t load enquiries</strong><span>{{ error() }}</span></div><button type="button" class="btn" (click)="load()">Try again</button></div>
      }

      <section class="card">
        <div class="toolbar">
          <div class="seg" role="group" aria-label="Type">
            <button type="button" [class.on]="channel() === 'form'" (click)="channel.set('form')">Form enquiries</button>
            <button type="button" [class.on]="channel() === 'taps'" (click)="channel.set('taps')">Call &amp; WhatsApp taps</button>
            <button type="button" [class.on]="channel() === 'all'" (click)="channel.set('all')">All</button>
          </div>
          <div class="right">
            <label><span class="sr-only">Where from</span>
              <select [value]="campaignFilter()" (change)="campaignFilter.set($any($event.target).value)">
                <option value="">Everywhere</option>
                @for (c of campaigns(); track c.id) { <option [value]="c.id" [selected]="c.id === campaignFilter()">{{ c.name }}</option> }
              </select>
            </label>
            <label><span class="sr-only">Search enquiries</span>
              <input type="search" placeholder="Search name, phone, {{ audience().agency ? 'hospital' : 'city' }}…" [value]="query()" (input)="query.set($any($event.target).value)">
            </label>
          </div>
        </div>

        @if (channel() !== 'taps') {
          <div class="tabs" role="tablist" aria-label="Status">
            @for (t of statusTabs; track t) {
              <button type="button" role="tab" [class.on]="status() === t" [attr.aria-selected]="status() === t" (click)="status.set(t)">
                {{ t === 'all' ? 'All' : statusLabel[t] }}<span class="count">{{ counts()[t] ?? 0 }}</span>
              </button>
            }
          </div>
        }

        <div class="table-wrap">
          <table class="data" style="min-width: 920px">
            <thead><tr><th>Received</th><th>Who</th><th>Contact</th><th>Where from</th><th>Status</th><th><span class="sr-only">Actions</span></th></tr></thead>
            <tbody>
              @for (l of visible(); track l.id) {
                <tr [class.fresh]="l.status === 'new' && l.channel === 'form'">
                  <td class="num" style="white-space: nowrap">{{ when(l.createdAt) }}</td>
                  <td>
                    @if (l.channel === 'form') {
                      <div class="who"><b>{{ l.name || 'No name given' }}</b>
                        @if (l.organisation || l.role) { <small>{{ l.organisation }}{{ l.organisation && l.role ? ' · ' : '' }}{{ l.role }}</small> }
                        @if (l.city) { <small>{{ l.city }}</small> }
                        @if (l.service) { <small class="svc">Wants: {{ l.service }}</small> }
                        @if (l.message) { <small class="msg">“{{ l.message }}”</small> }
                        @if (l.notes && notesFor() !== l.id) {
                          <button type="button" class="note-chip" (click)="toggleNotes(l)" title="Edit note"><span aria-hidden="true">✎</span> {{ l.notes }}<small>{{ l.updatedAt ? ' · ' + when(l.updatedAt) : '' }}</small></button>
                        }
                      </div>
                    } @else {
                      <span class="muted">{{ channelLabel[l.channel] }} button</span>
                    }
                  </td>
                  <td>
                    <div class="contact">
                      @if (l.phone) {
                        <a [href]="'tel:+' + digits(l.phone)">{{ l.phone }}</a>
                        <a [href]="'https://wa.me/' + digits(l.phone)" target="_blank" rel="noopener">WhatsApp ↗</a>
                      }
                      @if (l.email) { <a [href]="'mailto:' + l.email">{{ l.email }}</a> }
                      @if (!l.phone && !l.email) { <span class="muted">—</span> }
                    </div>
                  </td>
                  <td>
                    <div class="who">
                      @if (l.source === 'contact') {
                        <span><span class="src contact">Contact page</span></span>
                        @if (l.blogTitle) { <small class="blog-from">after reading: <b>{{ l.blogTitle }}</b></small> }
                        @if (l.campaignName) { <small>credited to {{ l.campaignName }}</small> }
                      } @else {
                        <span>{{ l.campaignName || 'Deleted campaign' }}</span>
                      }
                      @if (l.utmSource) { <small>via {{ sourceLabel(l) }}</small> }
                      @if (l.conversionId) { <small class="conv" title="Google Ads conversion ID">Google Ads · {{ l.conversionId }}</small> }
                    </div>
                  </td>
                  <td>
                    @if (l.channel === 'form') {
                      <label><span class="sr-only">Status</span>
                        <select class="status" [attr.data-tone]="statusTone[l.status]" [value]="l.status" [disabled]="busyId() === l.id" (change)="setStatus(l, $any($event.target).value)">
                          @for (s of statuses; track s) { <option [value]="s" [selected]="s === l.status">{{ statusLabel[s] }}</option> }
                        </select>
                      </label>
                    } @else { <span class="muted">—</span> }
                  </td>
                  <td class="r row-actions">
                    @if (l.channel === 'form') {
                      <button type="button" class="btn sm" (click)="toggleNotes(l)">{{ l.notes ? 'Edit note' : 'Add note' }}</button>
                    }
                    @if (isAdmin()) { <button type="button" class="btn sm danger-text" [disabled]="busyId() === l.id" (click)="remove(l)">Delete</button> }
                  </td>
                </tr>
                @if (notesFor() === l.id) {
                  <tr class="notes-row">
                    <td colspan="6">
                      <label class="notes"><span class="label">Notes for the team</span>
                        <textarea rows="3" [value]="draftNotes()" (input)="draftNotes.set($any($event.target).value)" placeholder="Called on 8 Nov — wants a proposal for Google Ads"></textarea>
                      </label>
                      <div class="notes-actions">
                        <button type="button" class="btn primary sm" [disabled]="busyId() === l.id" (click)="saveNotes(l)">Save note</button>
                        <button type="button" class="btn sm" (click)="notesFor.set(null)">Cancel</button>
                      </div>
                    </td>
                  </tr>
                }
              } @empty {
                <tr><td colspan="6" class="muted" style="text-align: center; padding: 28px">
                  @if (loading()) { Loading enquiries… }
                  @else if (all().length) { No enquiries match these filters. }
                  @else { No enquiries yet. They appear here when someone fills in the form on a campaign landing page. }
                </td></tr>
              }
            </tbody>
          </table>
        </div>
      </section>
    </div>
  `,
  styles: `
    .toolbar { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; justify-content: space-between; }
    .toolbar .right { display: flex; gap: 10px; flex-wrap: wrap; }
    .toolbar select, .toolbar input { border: 1px solid var(--line-strong); border-radius: 10px; padding: 0 12px; min-height: 40px; font-size: 13px; font-weight: 600; color: var(--ink); background: #fff; max-width: 260px; }
    .toolbar input { min-width: 220px; }
    @media (max-width: 560px) { .toolbar input, .toolbar select { min-width: 0; width: 100%; max-width: none; } }
    .who, .contact { display: flex; flex-direction: column; gap: 2px; }
    .who small { font-size: 12px; color: var(--muted); }
    .who .msg { font-style: italic; max-width: 280px; }
    .who .svc { color: var(--ink-2); font-weight: 600; }
    .note-chip { margin-top: 6px; align-self: flex-start; max-width: 320px; text-align: left; background: var(--amber-bg); color: var(--amber-ink); border: 0; border-radius: 8px; padding: 6px 9px; font: inherit; font-size: 12.5px; line-height: 1.45; cursor: pointer; white-space: pre-wrap; }
    .note-chip small { color: var(--amber-ink); opacity: .75; font-size: 11px; }
    .src { display: inline-block; font-size: 11.5px; font-weight: 800; padding: 2px 8px; border-radius: 99px; }
    .src.contact { background: var(--green-bg); color: var(--green-ink); }
    .blog-from b { color: var(--ink-2); font-weight: 700; }
    .conv { font-family: var(--mono); font-size: 11px; color: var(--blue-deep); }
    .contact a { font-size: 13px; font-weight: 600; }
    tr.fresh td:first-child { box-shadow: inset 3px 0 0 var(--blue); }
    .status { border: 1px solid var(--line-strong); border-radius: 99px; padding: 4px 10px; font-size: 12px; font-weight: 700; background: var(--paper); color: var(--ink); }
    .status[data-tone='blue'] { background: var(--blue-bg); color: var(--blue-deep); border-color: transparent; }
    .status[data-tone='amber'] { background: var(--amber-bg); color: var(--amber-ink); border-color: transparent; }
    .status[data-tone='green'] { background: var(--green-bg); color: var(--green-ink); border-color: transparent; }
    .row-actions { white-space: nowrap; }
    .row-actions .btn { margin-left: 6px; }
    .danger-text { color: var(--red-ink); }
    .notes-row td { background: var(--paper-alt); }
    .notes { display: flex; flex-direction: column; gap: 6px; }
    .notes .label { font-size: 12px; font-weight: 700; color: var(--ink-2); }
    .notes textarea { width: 100%; border: 1px solid var(--line-strong); border-radius: 8px; padding: 10px 12px; font-size: 14px; font-family: inherit; background: var(--paper); color: var(--ink); }
    .notes-actions { display: flex; gap: 8px; margin-top: 8px; }
  `
})
export class EnquiriesPage implements OnInit {
  private repo = inject(LeadRepository);
  private auth = inject(AuthService);
  clients = inject(ClientStore);
  private toast = inject(ToastService);
  readonly isMock = this.repo.mode === 'mock';
  readonly isAdmin = computed(() => this.auth.user()?.role === 'admin');
  readonly audience = computed(() => campaignAudience(this.clients.current()));

  /** ?campaign=<id> from the campaign list (component input binding). */
  campaign = input<string>();

  all = signal<Lead[]>([]);
  loading = signal(true);
  error = signal('');
  busyId = signal<string | null>(null);
  notesFor = signal<string | null>(null);
  draftNotes = signal('');

  channel = signal<ChannelFilter>('form');
  status = signal<StatusFilter>('all');
  campaignFilter = signal('');
  query = signal('');

  readonly statuses: LeadStatus[] = ['new', 'contacted', 'qualified', 'won', 'lost'];
  readonly statusTabs: StatusFilter[] = ['all', ...this.statuses];
  readonly statusLabel = STATUS_LABEL;
  readonly statusTone = STATUS_TONE;
  readonly channelLabel = CHANNEL_LABEL;

  ngOnInit(): void {
    if (this.campaign()) this.campaignFilter.set(this.campaign()!);
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

  /** "Where from" choices: the Contact Us page, blog posts, then each campaign that has enquiries. */
  campaigns = computed(() => {
    const seen = new Map<string, string>();
    if (this.all().some((l) => l.source === 'contact')) seen.set('contact', 'Contact Us page (all)');
    if (this.all().some((l) => l.blogPostId)) seen.set('blog', 'From blog posts (all)');
    for (const l of this.all()) {
      if (l.blogPostId && !seen.has('blog:' + l.blogPostId)) seen.set('blog:' + l.blogPostId, 'Blog · ' + (l.blogTitle || 'Deleted post'));
    }
    for (const l of this.all()) {
      if (l.source === 'contact' && !l.campaignId) continue;
      const id = this.whereKey(l);
      if (!seen.has(id)) seen.set(id, l.campaignName || 'Deleted campaign');
    }
    return [...seen].map(([id, name]) => ({ id, name }));
  });

  private whereKey(l: Lead): string {
    return l.campaignId ?? 'deleted:' + (l.campaignName ?? '');
  }

  private filtered = computed(() => {
    const ch = this.channel();
    const camp = this.campaignFilter();
    const q = this.query().trim().toLowerCase();
    return this.all().filter((l) => {
      if (ch === 'form' && l.channel !== 'form') return false;
      if (ch === 'taps' && l.channel === 'form') return false;
      if (camp === 'contact' && l.source !== 'contact') return false;
      if (camp === 'blog' && !l.blogPostId) return false;
      if (camp.startsWith('blog:') && 'blog:' + l.blogPostId !== camp) return false;
      if (camp && camp !== 'contact' && camp !== 'blog' && !camp.startsWith('blog:') && this.whereKey(l) !== camp) return false;
      if (!q) return true;
      return [l.name, l.organisation, l.phone, l.email, l.city, l.message, l.notes, l.service, l.blogTitle].some((v) => (v ?? '').toLowerCase().includes(q));
    });
  });

  counts = computed(() => {
    const c: Partial<Record<StatusFilter, number>> = { all: this.filtered().length };
    for (const l of this.filtered()) c[l.status] = (c[l.status] ?? 0) + 1;
    return c;
  });

  visible = computed(() => {
    const s = this.status();
    return this.channel() === 'taps' || s === 'all' ? this.filtered() : this.filtered().filter((l) => l.status === s);
  });

  private replace(updated: Lead): void {
    this.all.update((list) => list.map((l) => (l.id === updated.id ? { ...updated, campaignName: updated.campaignName ?? l.campaignName } : l)));
  }

  async setStatus(l: Lead, status: LeadStatus): Promise<void> {
    if (status === l.status) return;
    this.busyId.set(l.id);
    try {
      this.replace(await this.repo.update(l.id, { status }));
      this.toast.show(`Marked as ${STATUS_LABEL[status].toLowerCase()}`);
    } catch (err) {
      this.toast.show(apiMessage(err, 'Couldn’t update the enquiry.'));
      this.all.update((list) => [...list]); // re-render the select with the old value
    } finally {
      this.busyId.set(null);
    }
  }

  toggleNotes(l: Lead): void {
    if (this.notesFor() === l.id) {
      this.notesFor.set(null);
      return;
    }
    this.draftNotes.set(l.notes ?? '');
    this.notesFor.set(l.id);
  }

  async saveNotes(l: Lead): Promise<void> {
    this.busyId.set(l.id);
    try {
      this.replace(await this.repo.update(l.id, { notes: this.draftNotes().trim() }));
      this.notesFor.set(null);
      this.toast.show('Note saved');
    } catch (err) {
      this.toast.show(apiMessage(err, 'Couldn’t save the note.'));
    } finally {
      this.busyId.set(null);
    }
  }

  async remove(l: Lead): Promise<void> {
    if (!confirm(`Delete this enquiry${l.name ? ' from ' + l.name : ''}? Their details are removed permanently.`)) return;
    this.busyId.set(l.id);
    try {
      await this.repo.remove(l.id);
      this.all.update((list) => list.filter((x) => x.id !== l.id));
      this.toast.show('Enquiry deleted');
    } catch (err) {
      this.toast.show(apiMessage(err, 'Couldn’t delete the enquiry.'));
    } finally {
      this.busyId.set(null);
    }
  }

  /** "Google Ads", "Meta", "Google search", "direct visit", a referring site, or the raw tag. */
  sourceLabel(l: Lead): string {
    if (l.utmSource === 'google') return l.utmMedium === 'organic' ? 'Google search' : 'Google Ads';
    if (l.utmSource === 'meta') return 'Meta';
    if (l.utmSource === '(direct)') return 'direct visit';
    return l.utmMedium === 'referral' ? `${l.utmSource} (link)` : l.utmSource ?? '';
  }

  /** "8 Nov, 10:42" from "2026-11-08 10:42:00". */
  when(value: string): string {
    const d = new Date(value.replace(' ', 'T'));
    if (isNaN(d.getTime())) return value;
    return d.toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false });
  }

  /** Digits with the country code, for tel: and wa.me links. A bare 10-digit Indian mobile number gets 91 in front. */
  digits(phone: string): string {
    const d = phone.replace(/\D+/g, '').replace(/^0+/, '');
    return /^[6-9]\d{9}$/.test(d) ? '91' + d : d;
  }

  /** The enquiries shown, as a spreadsheet file. */
  downloadCsv(): void {
    const header = ['Received', 'Status', 'Where from', 'Type', 'Name', 'Organisation', 'Role', 'Phone', 'Email', 'City', 'Service', 'Message', 'Campaign', 'Blog post', 'Google Ads conversion ID', 'Source', 'Medium', 'UTM campaign', 'Page', 'Notes'];
    const rows = this.visible().map((l) => [
      l.createdAt, STATUS_LABEL[l.status], l.source === 'contact' ? 'Contact page' : 'Campaign page', CHANNEL_LABEL[l.channel], l.name, l.organisation, l.role, l.phone, l.email, l.city, l.service, l.message,
      l.campaignName, l.blogTitle, l.conversionId, l.utmSource, l.utmMedium, l.utmCampaign, l.pageUrl, l.notes
    ]);
    const csv = [header, ...rows].map((r) => r.map(csvCell).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `enquiries-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
}

/** Quotes a CSV cell, and stops text starting with = + - @ from running as a spreadsheet formula. */
function csvCell(value: string | null | undefined): string {
  let v = value ?? '';
  if (/^[=+\-@\t\r]/.test(v) && !/^\+[\d ()-]+$/.test(v)) v = "'" + v; // phone numbers like +91 … are safe
  return `"${v.replace(/"/g, '""')}"`;
}
