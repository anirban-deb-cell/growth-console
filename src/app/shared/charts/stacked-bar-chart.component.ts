import { Component, ElementRef, computed, input, signal, viewChild } from '@angular/core';
import { formatCompact, formatFull, niceTicks, observeWidth } from './chart-utils';

export interface BarSeries {
  name: string;
  color: string;
}

export interface StackedBarPoint {
  label: string;
  /** One value per series, bottom segment first. */
  values: number[];
}

/** Stacked columns: 2px surface gap between segments, rounded top cap, hover tooltip per column. */
@Component({
  selector: 'adm-stacked-bar-chart',
  template: `
    <div class="legend">
      @for (s of series(); track s.name) {
        <span><i [style.background]="s.color"></i>{{ s.name }}</span>
      }
    </div>
    <div class="chart" #host>
      <svg [attr.width]="width()" [attr.height]="height()" role="img" [attr.aria-label]="ariaLabel()" (mouseleave)="hover.set(-1)">
        @for (t of geo().ticks; track t.v) {
          <line class="grid" [attr.x1]="pad.l" [attr.x2]="width() - pad.r" [attr.y1]="t.y" [attr.y2]="t.y" />
          <text class="tick" [attr.x]="pad.l - 10" [attr.y]="t.y + 4" text-anchor="end">{{ fmt(t.v) }}</text>
        }
        @for (col of geo().cols; track col.label; let i = $index) {
          <g [class.dim]="hover() >= 0 && hover() !== i">
            @for (seg of col.segs; track $index) {
              <path [attr.d]="seg.d" [attr.fill]="seg.color" />
            }
          </g>
          <text class="tick" [attr.x]="col.cx" [attr.y]="height() - 8" text-anchor="middle">{{ col.label }}</text>
          <rect class="hit" [attr.x]="col.cx - geo().slot / 2" [attr.y]="pad.t" [attr.width]="geo().slot" [attr.height]="height() - pad.t - pad.b"
            (mouseenter)="hover.set(i)" />
        }
        @if (geo().cols.length; as n) {
          <text class="end-label" [attr.x]="geo().cols[n - 1].cx" [attr.y]="geo().cols[n - 1].top - 8" text-anchor="middle">
            {{ full(geo().cols[n - 1].total) }}
          </text>
        }
      </svg>
      @if (hover() >= 0) {
        <div class="tip" [style.left.px]="tipLeft()" [style.top.px]="geo().cols[hover()].top">
          <span class="tip-label">{{ data()[hover()].label }}</span>
          @for (s of series(); track s.name; let si = $index) {
            <span class="tip-row"><i [style.background]="s.color"></i>{{ s.name }} <b>{{ full(data()[hover()].values[si]) }}</b></span>
          }
          <span class="tip-row total">Total <b>{{ full(geo().cols[hover()].total) }}</b></span>
        </div>
      }
    </div>
  `,
  styles: `
    :host{display:block;}
    .legend{display:flex; gap:16px; flex-wrap:wrap; margin-bottom:10px; font-size:12px; color:var(--ink-soft);}
    .legend span{display:inline-flex; align-items:center; gap:7px;}
    .legend i, .tip-row i{width:10px; height:10px; border-radius:3px; display:inline-block;}
    .chart{position:relative; width:100%;}
    svg{display:block; overflow:visible;}
    .grid{stroke:var(--line); stroke-width:1; shape-rendering:crispEdges;}
    .tick{font-family:'IBM Plex Mono',monospace; font-size:10.5px; fill:var(--muted);}
    .end-label{font-family:'Manrope',sans-serif; font-weight:800; font-size:12px; fill:var(--ink);}
    g{transition:opacity .15s ease;}
    g.dim{opacity:.35;}
    .hit{fill:transparent; cursor:default;}
    .tip{
      position:absolute; transform:translate(-50%, calc(-100% - 12px)); pointer-events:none; white-space:nowrap;
      background:var(--navy); color:#fff; font-size:12px; padding:8px 11px; border-radius:6px; display:flex; flex-direction:column; gap:3px;
      box-shadow:0 6px 18px rgba(11,27,43,.18);
    }
    .tip-label{font-family:'IBM Plex Mono',monospace; font-size:10px; color:rgba(255,255,255,.6);}
    .tip-row{display:flex; align-items:center; gap:7px;}
    .tip-row b{margin-left:auto; padding-left:12px;}
    .tip-row.total{border-top:1px solid rgba(255,255,255,.15); padding-top:4px; margin-top:2px;}
  `
})
export class StackedBarChartComponent {
  data = input.required<StackedBarPoint[]>();
  series = input.required<BarSeries[]>();
  height = input(220);
  ariaLabel = input('Stacked bar chart');

  private host = viewChild.required<ElementRef<HTMLElement>>('host');
  width = observeWidth(this.host);
  hover = signal(-1);
  readonly pad = { l: 40, r: 10, t: 22, b: 30 };

  fmt = formatCompact;
  full = formatFull;

  geo = computed(() => {
    const data = this.data();
    const series = this.series();
    const { l, r, t, b } = this.pad;
    const innerW = Math.max(1, this.width() - l - r);
    const innerH = this.height() - t - b;
    const totals = data.map((d) => d.values.reduce((a, v) => a + v, 0));
    const tickVals = niceTicks(Math.max(1, ...totals));
    const max = tickVals[tickVals.length - 1];
    const slot = innerW / Math.max(1, data.length);
    const barW = Math.min(24, slot * 0.6);
    const base = t + innerH;
    const gap = 2;

    const cols = data.map((d, i) => {
      const cx = l + slot * i + slot / 2;
      const x = cx - barW / 2;
      let y = base;
      const nonZero = d.values.map((v, si) => ({ v, si })).filter((s) => s.v > 0);
      const segs = nonZero.map((s, k) => {
        const hgt = (s.v / max) * innerH;
        const isTop = k === nonZero.length - 1;
        // Gap is carved out of the segment's own height so totals stay true to scale.
        const segH = Math.max(0.5, hgt - (k > 0 ? gap : 0));
        const yTop = y - hgt;
        y = yTop;
        return { d: this.segPath(x, yTop, barW, segH, isTop ? 4 : 0), color: series[s.si]?.color ?? 'var(--blue)' };
      });
      return { label: d.label, cx, segs, total: totals[i], top: y };
    });

    return { cols, slot, ticks: tickVals.map((v) => ({ v, y: t + innerH * (1 - v / max) })) };
  });

  tipLeft = computed(() => {
    const i = this.hover();
    if (i < 0) return 0;
    return Math.min(this.width() - 80, Math.max(80, this.geo().cols[i].cx));
  });

  /** Rect with only the top corners rounded — square at the baseline. */
  private segPath(x: number, y: number, w: number, h: number, radius: number): string {
    const r = Math.min(radius, h, w / 2);
    if (!r) return `M${x},${y} h${w} v${h} h${-w} Z`;
    return `M${x},${y + h} V${y + r} Q${x},${y} ${x + r},${y} H${x + w - r} Q${x + w},${y} ${x + w},${y + r} V${y + h} Z`;
  }
}
