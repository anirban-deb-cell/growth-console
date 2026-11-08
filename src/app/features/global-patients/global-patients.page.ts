import { Component, computed, signal } from '@angular/core';

type Currency = 'USD' | 'AED' | 'BDT' | 'INR';

/** Sample exchange rates — the product reads these daily from a rates API. */
const RATES: Record<Currency, number> = { USD: 1, AED: 3.67, BDT: 119.5, INR: 84 };

@Component({
  selector: 'app-global-patients-page',
  template: `
    <div class="page">
      <header class="page-head">
        <div class="titles">
          <div class="title-row"><h1>Global patients</h1><span class="sample-badge">Sample data</span></div>
          <p>International enquiries from first message to arrival · last 30 days</p>
        </div>
        <div class="actions">
          <div class="seg" role="group" aria-label="Display currency">
            @for (c of currencies; track c) {
              <button type="button" [class.on]="currency() === c" [attr.aria-pressed]="currency() === c" (click)="currency.set(c)">{{ c }}</button>
            }
          </div>
          <button type="button" class="btn primary">+ Build package quote</button>
        </div>
      </header>

      <section class="grid kpis">
        @for (k of kpis(); track k.label) {
          <div class="kpi"><span class="label">{{ k.label }}</span><span class="value">{{ k.value }}</span><div class="foot">{{ k.note }}</div></div>
        }
      </section>

      <section class="card">
        <div class="card-head"><h2>Medical travel pipeline</h2><span class="sub">Names masked · pipeline value {{ money(64 * 4850) }}</span></div>
        <div style="overflow-x: auto; padding-bottom: 6px">
          <div class="board">
            @for (s of stages; track s.name) {
              <div class="col">
                <div class="col-head"><b>{{ s.name }}</b><span class="num muted">{{ s.count }}</span></div>
                <div class="track" style="height: 4px"><i [style.width.%]="(s.count / 186) * 100"></i></div>
                @for (p of s.cards; track p.who) {
                  <div class="pcard"><b>{{ p.who }}</b><span>{{ p.place }}</span><small>{{ p.treatment }}</small><em>{{ p.next }}</em></div>
                }
              </div>
            }
          </div>
        </div>
      </section>

      <section class="grid two">
        <div class="card">
          <h2 style="font-size: 17px; font-weight: 800">Enquiries by country</h2>
          @for (c of countries; track c.code) {
            <div class="country"><span class="code">{{ c.code }}</span><span style="font-weight: 600">{{ c.name }}</span><div class="track lg"><i [style.width.%]="(c.n / 48) * 100"></i></div><span class="num" style="text-align: right">{{ c.n }}</span></div>
          }
          <p style="margin: 4px 0 0; font-size: 13px; color: var(--ink-2); line-height: 1.5">Bangladesh and the Gulf bring 54% of enquiries. Kenya and Nigeria are growing fastest and may be worth their own campaign.</p>
        </div>

        <div class="card">
          <div class="card-head"><h2>Who to call right now</h2><span class="num sub">Hyderabad 14:02 IST</span></div>
          @for (w of callNow; track w.city) {
            <div class="call"><span class="num">{{ w.time }}</span><div><b>{{ w.city }}</b><small>{{ w.meta }}</small></div>
              @if (w.now) { <span class="pill green">Call now</span> } @else { <span class="pill grey">After 10:00</span> }
            </div>
          }
          <span class="muted" style="font-size: 12px">Coordinator on shift: [Coordinator name] · speaks English, Arabic, Bengali</span>
        </div>
      </section>

      <section class="grid two">
        <div class="card">
          <div class="card-head"><h2>Treatment package quote</h2><span class="sub">Draft · for J•••• W., Nairobi</span></div>
          <div class="row-2">
            <div class="field" style="margin: 0"><label for="tr">Treatment</label><input id="tr" type="text" value="Total knee replacement (one knee)"></div>
            <div class="field" style="margin: 0"><label for="sg">Lead surgeon</label><input id="sg" type="text" value="[Surgeon name]"></div>
          </div>
          <div>
            @for (q of quote(); track q.item) {
              <div class="qline"><span>{{ q.item }}</span><span class="num">{{ q.amount }}</span></div>
            }
            <div class="qline total"><span>All-inclusive estimate</span><span class="num">{{ quoteTotal() }}</span></div>
            <span class="muted" style="font-size: 12px">Valid 30 days · patient’s copy shown in KES · exchange rates are sample values</span>
          </div>
          <div style="display: flex; gap: 8px; flex-wrap: wrap">
            <button type="button" class="btn green">Send on WhatsApp</button>
            <button type="button" class="btn">Download PDF</button>
            <button type="button" class="btn">Generate visa invitation letter</button>
          </div>
        </div>

        <div style="display: flex; flex-direction: column; gap: 16px">
          <div class="card">
            <h2 style="font-size: 17px; font-weight: 800">Facilitator partners</h2>
            <div class="table-wrap">
              <table class="data" style="min-width: 360px; font-size: 13px">
                <thead><tr><th>Partner</th><th class="r">Referrals</th><th class="r">Arrived</th><th class="r">Commission</th></tr></thead>
                <tbody>
                  <tr><td><b>[Partner A]</b> · Dhaka</td><td class="r num">11</td><td class="r num">3</td><td class="r num">[%]</td></tr>
                  <tr><td><b>[Partner B]</b> · Nairobi</td><td class="r num">8</td><td class="r num">2</td><td class="r num">[%]</td></tr>
                  <tr><td><b>[Partner C]</b> · Muscat</td><td class="r num">5</td><td class="r num">1</td><td class="r num">[%]</td></tr>
                </tbody>
              </table>
            </div>
            <a href="#partners" style="font-size: 13px; font-weight: 700">Invite a partner to their referral portal →</a>
          </div>
          <div class="card">
            <h2 style="font-size: 17px; font-weight: 800">Landing pages by language</h2>
            <div style="display: flex; flex-wrap: wrap; gap: 8px">
              <span class="pill green">English · live · 74</span>
              <span class="pill green" lang="ar">العربية · live · 47</span>
              <span class="pill green" lang="bn">বাংলা · live · 41</span>
              <span class="pill amber" lang="fr">Français · in review</span>
              <span class="pill grey" lang="sw">Kiswahili · planned</span>
            </div>
            <span class="muted" style="font-size: 12px">Numbers are enquiries from each page in the last 30 days. Arabic pages render right-to-left.</span>
          </div>
        </div>
      </section>
    </div>
  `,
  styles: `
    .board { display: grid; grid-template-columns: repeat(7, minmax(190px, 1fr)); gap: 12px; min-width: 1380px; }
    .col { background: var(--bg); border-radius: 12px; padding: 12px; display: flex; flex-direction: column; gap: 10px; }
    .col-head { display: flex; justify-content: space-between; align-items: baseline; font-size: 13px; }
    .pcard { background: #fff; border: 1px solid var(--line); border-radius: 10px; padding: 10px 12px; display: flex; flex-direction: column; gap: 3px; font-size: 13px; }
    .pcard span { font-size: 12px; color: var(--ink-2); }
    .pcard small { font-size: 12px; color: var(--muted); }
    .pcard em { font-style: normal; font-size: 11px; font-weight: 800; color: var(--blue-deep); margin-top: 4px; }
    .country { display: grid; grid-template-columns: 34px 140px minmax(0, 1fr) 36px; gap: 10px; align-items: center; font-size: 13px; }
    .country .code { font-size: 11px; font-weight: 800; color: var(--blue-deep); background: var(--blue-bg); border-radius: 6px; padding: 3px 0; text-align: center; }
    .call { display: flex; align-items: center; gap: 12px; padding: 8px 0; border-bottom: 1px solid var(--line-soft); }
    .call > .num { width: 52px; font-size: 15px; font-weight: 600; }
    .call div { flex: 1; display: flex; flex-direction: column; gap: 2px; font-size: 14px; }
    .call small { font-size: 12px; color: var(--muted); }
    .qline { display: flex; justify-content: space-between; gap: 12px; padding: 9px 0; border-bottom: 1px solid var(--line-soft); font-size: 14px; }
    .qline.total { border-bottom: 0; font-size: 16px; font-weight: 800; padding-top: 12px; }
  `
})
export class GlobalPatientsPage {
  readonly currencies: Currency[] = ['USD', 'AED', 'BDT', 'INR'];
  currency = signal<Currency>('USD');

  money(usd: number): string {
    const c = this.currency();
    const v = Math.round(usd * RATES[c]);
    if (c === 'USD') return '$' + v.toLocaleString('en-US');
    if (c === 'AED') return 'AED ' + v.toLocaleString('en-US');
    return (c === 'BDT' ? '৳' : '₹') + v.toLocaleString('en-IN');
  }

  kpis = computed(() => [
    { label: 'International enquiries', value: '186', note: '▲ 31% vs last 30 days' },
    { label: 'Medical reports received', value: '92', note: '49% of enquiries' },
    { label: 'Doctor opinions sent', value: '78', note: 'median 31 h turnaround' },
    { label: 'Quotes sent', value: '64', note: 'average package ' + this.money(4850) },
    { label: 'Visa letters issued', value: '21', note: 'generated in the app' },
    { label: 'Patients arrived', value: '13', note: '7% of enquiries' }
  ]);

  readonly stages = [
    { name: 'Enquiry', count: 186, cards: [{ who: 'M•••• H.', place: 'Dhaka, Bangladesh', treatment: 'Knee replacement', next: 'Reply within 1 h' }, { who: 'Y•••• A.', place: 'Muscat, Oman', treatment: 'Cardiac check-up', next: 'Ask for reports' }] },
    { name: 'Reports received', count: 92, cards: [{ who: 'A•••• O.', place: 'Lagos, Nigeria', treatment: 'Cardiac bypass', next: 'Opinion due in 48 h' }] },
    { name: 'Opinion sent', count: 78, cards: [{ who: 'S•••• K.', place: 'Muscat, Oman', treatment: 'Spine surgery', next: 'Follow up in 2 days' }] },
    { name: 'Quote sent', count: 64, cards: [{ who: 'J•••• W.', place: 'Nairobi, Kenya', treatment: 'Knee replacement', next: 'Quote valid 30 days' }] },
    { name: 'Visa letter', count: 21, cards: [{ who: 'H•••• R.', place: 'Baghdad, Iraq', treatment: 'Liver evaluation', next: 'Track visa status' }] },
    { name: 'Travel booked', count: 17, cards: [{ who: 'F•••• N.', place: 'Malé, Maldives', treatment: 'Hip replacement', next: 'Arrange airport pickup' }] },
    { name: 'Arrived', count: 13, cards: [{ who: 'T•••• B.', place: 'Dubai, UAE', treatment: 'Cardiac check-up', next: 'Interpreter assigned' }] }
  ];

  readonly countries = [['BD', 'Bangladesh', 48], ['AE', 'UAE', 31], ['OM', 'Oman', 22], ['GB', 'UK & US diaspora', 20], ['KE', 'Kenya', 19], ['NG', 'Nigeria', 18], ['IQ', 'Iraq', 16], ['MV', 'Maldives', 12]]
    .map(([code, name, n]) => ({ code: code as string, name: name as string, n: n as number }));

  readonly callNow = [
    { time: '14:32', city: 'Dhaka', meta: '9 waiting · Bengali', now: true },
    { time: '12:32', city: 'Dubai & Muscat', meta: '7 waiting · Arabic', now: true },
    { time: '11:32', city: 'Nairobi', meta: '4 waiting · English', now: true },
    { time: '11:32', city: 'Baghdad', meta: '3 waiting · Arabic', now: true },
    { time: '09:32', city: 'Lagos', meta: '3 waiting · English', now: false },
    { time: '09:32', city: 'London', meta: '2 waiting · English', now: false }
  ];

  private readonly items: [string, number][] = [['Surgery & implant', 4200], ['Hospital stay · 5 nights', 900], ['Physiotherapy · 6 sessions', 240], ['Airport pickup & interpreter', 120], ['Follow-up video consult', 0]];

  quote = computed(() => this.items.map(([item, usd]) => ({ item, amount: usd === 0 ? 'Included' : this.money(usd) })));
  quoteTotal = computed(() => this.money(this.items.reduce((a, [, usd]) => a + usd, 0)));
}
