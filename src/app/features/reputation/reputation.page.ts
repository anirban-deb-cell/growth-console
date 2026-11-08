import { Component, computed, inject, signal } from '@angular/core';
import { ClientStore, ToastService } from '../../core/data/stores';

interface Review {
  id: number;
  author: string;
  rating: number;
  branch: string;
  ago: string;
  text: string;
  drafts: [string, string];
}

type Filter = 'awaiting' | 'all' | 'low';

const REVIEWS: Review[] = [
  { id: 1, author: 'Kiran R.', rating: 2, branch: 'Kondapur', ago: '3 h ago', text: 'Waited almost 90 minutes past my appointment time at the OPD. Doctor was good but nobody told us about the delay.', drafts: ['Thank you for telling us about this, Kiran, and we’re sorry for the long wait and the lack of updates. That’s not the experience we want for anyone. We’ve shared your feedback with our Kondapur OPD team. If you’re willing, please contact our patient relations desk at [phone] so we can look into it.', 'Dear Kiran, we apologise for the delay you faced and for not keeping you informed. We are reviewing how our Kondapur OPD communicates waiting times. Our patient relations team would value the chance to speak with you at [phone].'] },
  { id: 2, author: 'Meera S.', rating: 5, branch: 'Banjara Hills', ago: '6 h ago', text: 'The cardiology team explained everything clearly and the nurses were very kind to my father.', drafts: ['Thank you so much, Meera! We’re glad the team made things clear and comfortable. We’ll pass your kind words on to them.', 'Dear Meera, thank you for your generous feedback. We have shared it with our cardiology and nursing teams.'] },
  { id: 3, author: 'Anil T.', rating: 3, branch: 'LB Nagar', ago: 'Yesterday', text: 'Billing counter was slow and parking is difficult. Treatment itself was fine.', drafts: ['Thank you for the feedback, Anil. We’re working on faster billing at LB Nagar, and we’re sorry parking was difficult. Your comments help us improve.', 'Dear Anil, thank you for sharing this. We are reviewing billing wait times and parking arrangements at our LB Nagar branch.'] },
  { id: 4, author: 'Fatima Z.', rating: 5, branch: 'Kondapur', ago: '2 days ago', text: 'Very clean hospital and quick registration. Pediatric doctor was patient with my son.', drafts: ['Thank you, Fatima! We’re happy the visit went smoothly and we’ll share your note with the pediatric team.', 'Dear Fatima, thank you for your kind words. We have passed them on to our team.'] },
  { id: 5, author: 'Rohit P.', rating: 1, branch: 'Banjara Hills', ago: '3 days ago', text: 'Called three times to reschedule and no one picked up the phone.', drafts: ['We’re sorry, Rohit, that you couldn’t get through to us. That shouldn’t happen. Please message us on WhatsApp at [number] and our front desk will help you right away.', 'Dear Rohit, we apologise for the difficulty reaching us. Our team is reviewing call handling. Please contact us on WhatsApp at [number] for immediate help.'] }
];

@Component({
  selector: 'app-reputation-page',
  template: `
    <div class="page">
      <header class="page-head">
        <div class="titles">
          <div class="title-row"><h1>Reputation</h1><span class="sample-badge">Sample data</span></div>
          <span class="chip ok" style="align-self: flex-start"><span class="dot"></span>Google Business Profile · {{ clients.current().branches.length }} locations</span>
        </div>
        <div class="actions"><button type="button" class="btn">Send review requests</button></div>
      </header>

      <section class="grid three">
        <div class="card">
          <h2 style="font-size: 17px; font-weight: 800">Google rating</h2>
          <div style="display: flex; align-items: baseline; gap: 10px"><span class="num" style="font-size: 44px; font-weight: 600">{{ clients.current().rating }}</span><span class="stars" aria-hidden="true">★★★★★</span></div>
          <span class="muted" style="font-size: 13px">1,248 reviews · up from 4.4 in March</span>
          @for (d of distribution; track d.star) {
            <div class="dist"><span class="num">{{ d.star }}★</span><div class="track"><i [style.width.%]="d.pct" style="background: var(--amber)"></i></div><span class="num muted">{{ d.n }}</span></div>
          }
        </div>
        <div class="card">
          <h2 style="font-size: 17px; font-weight: 800">By branch</h2>
          @for (b of branches(); track b.name) {
            <div class="branch"><div><b>{{ b.name }}</b><small>{{ b.meta }}</small></div><span class="num">{{ b.rating }}</span></div>
          }
        </div>
        <div class="card">
          <h2 style="font-size: 17px; font-weight: 800">Response health</h2>
          <div class="row-2" style="gap: 10px">
            <div class="stat"><b>89%</b><span>Reviews replied to</span></div>
            <div class="stat"><b>1.4 d</b><span>Average reply time</span></div>
            <div class="stat"><b>64</b><span>New this month</span></div>
            <div class="stat warn"><b>{{ awaitingCount() }}</b><span>Awaiting a reply</span></div>
          </div>
        </div>
      </section>

      <section class="split">
        <div class="main card">
          <div class="tabs" role="tablist" aria-label="Filter reviews">
            <button type="button" role="tab" [class.on]="filter() === 'awaiting'" (click)="filter.set('awaiting')">Awaiting reply</button>
            <button type="button" role="tab" [class.on]="filter() === 'all'" (click)="filter.set('all')">All reviews</button>
            <button type="button" role="tab" [class.on]="filter() === 'low'" (click)="filter.set('low')">Low ratings</button>
          </div>
          @for (r of visible(); track r.id) {
            <button type="button" class="list-row review" [class.on]="r.id === selectedId()" [attr.aria-pressed]="r.id === selectedId()" (click)="select(r.id)">
              <span class="top"><b>{{ r.author }} · <span class="stars sm">{{ stars(r.rating) }}</span></b><span class="pill" [class]="isReplied(r.id) ? 'green' : 'amber'">{{ isReplied(r.id) ? 'Replied' : 'Awaiting reply' }}</span></span>
              <span class="text">{{ r.text }}</span>
              <small>{{ r.branch }} · {{ r.ago }}</small>
            </button>
          } @empty {
            <p class="muted" style="text-align: center; padding: 24px 0; margin: 0">All caught up — no reviews here.</p>
          }
        </div>

        <aside class="side card" aria-label="Reply">
          <span class="eyebrow" style="color: var(--muted)">Reply to {{ selected().author }}</span>
          <div class="quote"><span class="stars sm">{{ stars(selected().rating) }}</span> “{{ selected().text }}”</div>
          <div style="display: flex; justify-content: space-between; align-items: center; gap: 10px; flex-wrap: wrap">
            <b style="font-size: 13px">AI draft · {{ tone() === 0 ? 'warm' : 'formal' }}</b>
            <button type="button" class="btn sm" (click)="tone.set(tone() === 0 ? 1 : 0)">Try another tone</button>
          </div>
          <div class="draft">{{ selected().drafts[tone()] }}</div>
          <div class="privacy"><b>✓</b><span>Doesn’t confirm the reviewer was a patient or mention any treatment, so it protects patient confidentiality.</span></div>
          @if (isReplied(selected().id)) {
            <span style="font-size: 13px; font-weight: 700; color: var(--green-ink)">✓ Posted to Google by you</span>
          } @else {
            <div style="display: flex; gap: 8px; flex-wrap: wrap">
              <button type="button" class="btn primary" style="flex: 1" (click)="approve()">Approve &amp; post</button>
              <button type="button" class="btn" style="flex: 1">Edit draft</button>
            </div>
          }
        </aside>
      </section>
    </div>
  `,
  styles: `
    .stars { font-size: 20px; color: #A86F00; letter-spacing: 2px; }
    .stars.sm { font-size: 13px; letter-spacing: 1px; }
    .dist { display: grid; grid-template-columns: 26px minmax(0, 1fr) 40px; gap: 8px; align-items: center; font-size: 12px; }
    .dist span:last-child { text-align: right; }
    .branch { display: flex; align-items: center; gap: 12px; padding: 8px 0; border-bottom: 1px solid var(--line-soft); }
    .branch div { flex: 1; display: flex; flex-direction: column; gap: 2px; }
    .branch small { font-size: 12px; color: var(--muted); }
    .branch .num { font-size: 20px; font-weight: 600; }
    .review { flex-direction: column; align-items: flex-start; gap: 6px; }
    .review .top { display: flex; justify-content: space-between; gap: 10px; width: 100%; font-size: 14px; }
    .review .text { font-size: 13px; color: var(--ink-2); line-height: 1.5; }
    .review small { font-size: 12px; color: var(--muted); }
    .quote { background: var(--bg); border-radius: 12px; padding: 12px 14px; font-size: 13px; color: var(--ink-2); line-height: 1.55; }
    .draft { border: 1.5px solid #9DB8EC; border-radius: 12px; padding: 14px; font-size: 14px; line-height: 1.6; background: #FBFCFF; }
    .privacy { display: flex; gap: 8px; font-size: 12px; color: var(--green-ink); background: var(--green-bg); border-radius: 10px; padding: 10px 12px; line-height: 1.5; }
  `
})
export class ReputationPage {
  clients = inject(ClientStore);
  private toast = inject(ToastService);

  filter = signal<Filter>('awaiting');
  selectedId = signal(1);
  tone = signal<0 | 1>(0);
  replied = signal<number[]>([4]);

  readonly distribution = [[5, 812], [4, 271], [3, 84], [2, 38], [1, 43]].map(([star, n]) => ({ star, n, pct: Math.round((n / 1248) * 100) }));

  branches = computed(() => {
    const names = this.clients.current().branches;
    const sample = [['584 reviews · 3 awaiting', '4.7'], ['412 reviews · 2 awaiting', '4.6'], ['252 reviews · 2 awaiting', '4.4'], ['198 reviews · 1 awaiting', '4.5']];
    return names.map((name, i) => ({ name, meta: sample[i % sample.length][0], rating: sample[i % sample.length][1] }));
  });

  visible = computed(() =>
    REVIEWS.filter((r) => (this.filter() === 'all' ? true : this.filter() === 'low' ? r.rating <= 3 : !this.replied().includes(r.id)))
  );

  selected = computed(() => REVIEWS.find((r) => r.id === this.selectedId()) ?? REVIEWS[0]);
  awaitingCount = computed(() => REVIEWS.filter((r) => !this.replied().includes(r.id)).length);

  isReplied(id: number): boolean {
    return this.replied().includes(id);
  }

  stars(n: number): string {
    return '★★★★★'.slice(0, n) + '☆☆☆☆☆'.slice(0, 5 - n);
  }

  select(id: number): void {
    this.selectedId.set(id);
    this.tone.set(0);
  }

  approve(): void {
    this.replied.update((list) => [...list, this.selected().id]);
    this.toast.show(`Reply to ${this.selected().author} posted to Google`);
  }
}
