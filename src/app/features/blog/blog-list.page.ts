import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { apiMessage } from '../../core/auth/auth.service';
import { BlogPost, PostStatus } from '../../core/data/models';
import { ClientStore, ToastService } from '../../core/data/stores';
import { BlogRepository } from './blog-repository';
import { ScoreRingComponent } from '../../shared/charts/score-ring.component';
import { fmt, shortDate } from '../../shared/format';

type StatusFilter = 'all' | PostStatus;

export const POST_STATUS_LABEL: Record<PostStatus, string> = { published: 'Published', scheduled: 'Scheduled', in_review: 'In review', draft: 'Draft' };
const POST_STATUS_TONE: Record<PostStatus, string> = { published: 'green', scheduled: 'blue', in_review: 'amber', draft: 'grey' };

@Component({
  selector: 'app-blog-list-page',
  imports: [RouterLink, ScoreRingComponent],
  template: `
    <div class="page">
      <header class="page-head">
        <div class="titles">
          <span class="eyebrow">Content</span>
          <div class="title-row"><h1>Blog posts</h1>@if (isMock) { <span class="sample-badge">Sample data</span> }</div>
          <p>Every post's SEO score, structured data, conversion tracking and results in one place · {{ clients.current().website }}</p>
        </div>
        <div class="actions"><a routerLink="/blog/new" class="btn primary">+ New post</a></div>
      </header>

      <section class="grid kpis">
        @if (isMock) {
          <div class="kpi"><span class="label">Search clicks · 30 days</span><span class="value">{{ totals().clicks }}</span><div class="foot">from published posts</div></div>
          <div class="kpi"><span class="label">Enquiries from posts · 30 days</span><span class="value">{{ totals().leads }}</span><div class="foot">contact clicks on post pages</div></div>
        } @else {
          <div class="kpi"><span class="label">Live on the website</span><span class="value">{{ (counts()['published'] ?? 0) + (counts()['scheduled'] ?? 0) }}</span><div class="foot">{{ counts()['scheduled'] ?? 0 }} scheduled</div></div>
          <div class="kpi"><span class="label">Waiting</span><span class="value">{{ (counts()['draft'] ?? 0) + (counts()['in_review'] ?? 0) }}</span><div class="foot">{{ counts()['draft'] ?? 0 }} drafts · {{ counts()['in_review'] ?? 0 }} in review</div></div>
          <a class="kpi" routerLink="/enquiries" [queryParams]="{ campaign: 'blog' }" style="text-decoration: none; color: inherit"><span class="label">Visits → enquiries</span><span class="value">{{ fmt(totals().visits) }} → {{ totals().blogLeads }}</span><div class="foot">{{ totals().conversion }} conversion · all posts</div></a>
        }
        <div class="kpi"><span class="label">Average SEO score</span><span class="value">{{ totals().avg }}<small>/100</small></span><div class="foot">across {{ posts().length }} posts</div></div>
      </section>

      @if (error()) {
        <div class="alert danger" role="alert"><div class="body"><strong>Couldn’t load posts</strong><span>{{ error() }}</span></div><button type="button" class="btn" (click)="load()">Try again</button></div>
      }

      <section class="card">
        <div class="toolbar">
          <div class="tabs" role="tablist" aria-label="Status">
            @for (f of filters; track f) {
              <button type="button" role="tab" [class.on]="status() === f" [attr.aria-selected]="status() === f" (click)="status.set(f)">
                {{ f === 'all' ? 'All' : statusLabel[f] }}<span class="count">{{ counts()[f] ?? 0 }}</span>
              </button>
            }
          </div>
          <label><span class="sr-only">Search posts</span><input class="search" type="search" placeholder="Search title or category…" [value]="query()" (input)="query.set($any($event.target).value)"></label>
        </div>

        <div class="table-wrap">
          <table class="data" style="min-width: 900px">
            <thead><tr><th>Post</th><th>Status</th><th>SEO</th><th>Ready for Google</th>@if (isMock) {<th class="r">Clicks · 30 days</th><th class="r">Leads · 30 days</th>} @else {<th class="r">Visits</th><th class="r">Enquiries</th><th class="r">Conversion</th>}<th><span class="sr-only">Actions</span></th></tr></thead>
            <tbody>
              @for (p of visible(); track p.id) {
                <tr>
                  <td><div class="post-cell"><b>{{ p.title }}</b><small>{{ p.category }} · {{ shortDate(p.date) }} · {{ p.author }}</small></div></td>
                  <td><span class="pill" [class]="statusTone[p.status]">{{ statusLabel[p.status] }}</span></td>
                  <td><adm-score-ring [score]="p.seoScore" [size]="40" [showLabel]="false" /></td>
                  <td>
                    <div class="checks">
                      <span class="check" [class.on]="p.hasSchema">Schema</span>
                      <span class="check" [class.on]="p.hasVideo">Video</span>
                    </div>
                  </td>
                  @if (isMock) {
                    <td class="r num">{{ p.status === 'published' ? fmt(p.clicks30d) : '—' }}</td>
                    <td class="r num">{{ p.status === 'published' ? p.leads30d : '—' }}</td>
                  } @else {
                    <td class="r num">{{ p.visitCount ? fmt(p.visitCount) : '—' }}</td>
                    <td class="r num">
                      @if (p.leadCount) {
                        <a routerLink="/enquiries" [queryParams]="{ campaign: 'blog:' + p.id }" title="Contact Us enquiries from people who read this post">{{ p.leadCount }}</a>
                        @if (p.newLeadCount) { <span class="pill blue" style="margin-left: 4px">{{ p.newLeadCount }} new</span> }
                      } @else { — }
                    </td>
                    <td class="r num"><b>{{ conversion(p) }}</b></td>
                  }
                  <td class="r actions">
                    @if (p.status === 'published') { <a [href]="p.url || 'https://' + clients.current().website + '/blog/' + p.slug" target="_blank" rel="noopener">View ↗</a> }
                    <a [routerLink]="['/blog', p.id, 'edit']">Edit</a>
                    @if (p.status === 'draft' || p.status === 'in_review') { <button type="button" class="btn link danger-link" (click)="remove(p)">Delete</button> }
                  </td>
                </tr>
              } @empty {
                <tr><td colspan="8" class="muted" style="text-align: center; padding: 28px">
                  @if (loading()) { Loading posts… } @else if (posts().length) { No posts match. } @else { No posts yet. <a routerLink="/blog/new">Write the first one →</a> }
                </td></tr>
              }
            </tbody>
          </table>
        </div>
      </section>
    </div>
  `,
  styles: `
    .toolbar { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
    .search { border: 1px solid var(--line-strong); border-radius: 10px; padding: 0 12px; min-height: 40px; font-size: 13px; min-width: 240px; background: #fff; color: var(--ink); }
    @media (max-width: 560px) { .search { min-width: 0; width: 100%; } }
    .post-cell { display: flex; flex-direction: column; gap: 3px; max-width: 380px; }
    .post-cell small { font-size: 12px; color: var(--muted); }
    .checks { display: flex; gap: 5px; flex-wrap: wrap; }
    .check { font-family: var(--mono); font-size: 10.5px; padding: 3px 7px; border-radius: 5px; border: 1px dashed var(--line-strong); color: var(--muted); }
    .check::before { content: '○ '; }
    .check.on { border-style: solid; border-color: transparent; background: var(--green-bg); color: var(--green-ink); }
    .check.on::before { content: '✓ '; }
    .actions { white-space: nowrap; }
    .actions a, .actions button { font-size: 13px; font-weight: 700; margin-left: 12px; }
    .danger-link { color: var(--red-ink); }
  `
})
export class BlogListPage implements OnInit {
  clients = inject(ClientStore);
  private repo = inject(BlogRepository);
  private toast = inject(ToastService);
  readonly isMock = this.repo.mode === 'mock';

  private all = signal<BlogPost[]>([]);
  loading = signal(true);
  error = signal('');

  readonly filters: StatusFilter[] = ['all', 'published', 'scheduled', 'in_review', 'draft'];
  readonly statusLabel = POST_STATUS_LABEL;
  readonly statusTone = POST_STATUS_TONE;

  status = signal<StatusFilter>('all');
  query = signal('');

  posts = computed(() => this.all().slice().sort((a, b) => b.date.localeCompare(a.date)));

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

  counts = computed(() => {
    const c: Partial<Record<StatusFilter, number>> = { all: this.posts().length };
    for (const p of this.posts()) c[p.status] = (c[p.status] ?? 0) + 1;
    return c;
  });

  visible = computed(() => {
    const q = this.query().trim().toLowerCase();
    return this.posts().filter((p) => (this.status() === 'all' || p.status === this.status()) && (!q || p.title.toLowerCase().includes(q) || p.category.toLowerCase().includes(q)));
  });

  totals = computed(() => {
    const published = this.posts().filter((p) => p.status === 'published');
    const all = this.posts();
    return {
      clicks: fmt(published.reduce((a, p) => a + p.clicks30d, 0)),
      leads: published.reduce((a, p) => a + p.leads30d, 0),
      avg: all.length ? Math.round(all.reduce((a, p) => a + p.seoScore, 0) / all.length) : 0,
      visits: all.reduce((a, p) => a + (p.visitCount ?? 0), 0),
      blogLeads: all.reduce((a, p) => a + (p.leadCount ?? 0), 0),
      conversion: (() => {
        const v = all.reduce((a, p) => a + (p.visitCount ?? 0), 0);
        return v ? ((100 * all.reduce((a, p) => a + (p.leadCount ?? 0), 0)) / v).toFixed(1) + '%' : '—';
      })()
    };
  });

  fmt = fmt;
  shortDate = shortDate;

  /** Enquiries credited to the post ÷ its visits, all time. */
  conversion(p: BlogPost): string {
    return p.visitCount ? ((100 * (p.leadCount ?? 0)) / p.visitCount).toFixed(1) + '%' : '—';
  }

  async remove(p: BlogPost): Promise<void> {
    if (!confirm(`Delete “${p.title}”? This can’t be undone.`)) return;
    try {
      await this.repo.remove(p.id);
      this.all.update((list) => list.filter((x) => x.id !== p.id));
      this.toast.show('Post deleted');
    } catch (err) {
      this.toast.show(apiMessage(err, 'Couldn’t delete the post.'));
    }
  }
}
