import { Component, ElementRef, computed, input, signal, viewChild } from '@angular/core';
import { formatCompact, formatFull, niceTicks, observeWidth } from './chart-utils';

export interface LinePoint {
  label: string;
  value: number;
}

/** Single-series area/line chart with a hover crosshair + tooltip. */
@Component({
  selector: 'adm-line-chart',
  template: `
    <div class="chart" #host>
      <svg [attr.width]="width()" [attr.height]="height()" role="img" [attr.aria-label]="ariaLabel()"
        (mousemove)="onMove($event)" (mouseleave)="hover.set(-1)">
        @for (t of geo().ticks; track t.v) {
          <line class="grid" [attr.x1]="pad.l" [attr.x2]="width() - pad.r" [attr.y1]="t.y" [attr.y2]="t.y" />
          <text class="tick" [attr.x]="pad.l - 10" [attr.y]="t.y + 4" text-anchor="end">{{ fmt(t.v) }}</text>
        }
        @for (x of geo().xLabels; track x.i) {
          <text class="tick" [attr.x]="x.x" [attr.y]="height() - 8" text-anchor="middle">{{ x.label }}</text>
        }
        <path class="area" [attr.d]="geo().area" />
        <path class="line" [attr.d]="geo().line" />
        @if (geo().last; as last) {
          @if (hover() < 0) {
            <circle class="dot" [attr.cx]="last.x" [attr.cy]="last.y" r="4.5" />
          }
        }
        @if (hover() >= 0) {
          <line class="cross" [attr.x1]="geo().pts[hover()].x" [attr.x2]="geo().pts[hover()].x" [attr.y1]="pad.t" [attr.y2]="height() - pad.b" />
          <circle class="dot" [attr.cx]="geo().pts[hover()].x" [attr.cy]="geo().pts[hover()].y" r="5" />
        }
      </svg>
      @if (hover() >= 0) {
        <div class="tip" [style.left.px]="tipLeft()" [style.top.px]="geo().pts[hover()].y">
          <span class="tip-label">{{ points()[hover()].label }}</span>
          <b>{{ full(points()[hover()].value) }}</b> {{ unit() }}
        </div>
      }
    </div>
  `,
  styles: `
    :host{display:block;}
    .chart{position:relative; width:100%;}
    svg{display:block; overflow:visible;}
    .grid{stroke:var(--line); stroke-width:1; shape-rendering:crispEdges;}
    .tick{font-family:'IBM Plex Mono',monospace; font-size:10.5px; fill:var(--muted);}
    .area{fill:var(--blue); opacity:.09;}
    .line{fill:none; stroke:var(--blue); stroke-width:2; stroke-linejoin:round; stroke-linecap:round;}
    .dot{fill:var(--blue); stroke:#fff; stroke-width:2;}
    .cross{stroke:var(--line-strong); stroke-width:1; shape-rendering:crispEdges;}
    .tip{
      position:absolute; transform:translate(-50%, calc(-100% - 14px)); pointer-events:none; white-space:nowrap;
      background:var(--navy); color:#fff; font-size:12px; padding:7px 10px; border-radius:6px;
      box-shadow:0 6px 18px rgba(11,27,43,.18);
    }
    .tip-label{display:block; font-family:'IBM Plex Mono',monospace; font-size:10px; color:rgba(255,255,255,.6); margin-bottom:2px;}
  `
})
export class LineChartComponent {
  points = input.required<LinePoint[]>();
  height = input(220);
  unit = input('');
  ariaLabel = input('Line chart');

  private host = viewChild.required<ElementRef<HTMLElement>>('host');
  width = observeWidth(this.host);
  hover = signal(-1);
  readonly pad = { l: 50, r: 18, t: 12, b: 30 };

  fmt = formatCompact;
  full = formatFull;

  geo = computed(() => {
    const pts = this.points();
    const w = this.width();
    const h = this.height();
    const { l, r, t, b } = this.pad;
    const innerW = Math.max(1, w - l - r);
    const innerH = h - t - b;
    const tickVals = niceTicks(Math.max(1, ...pts.map((p) => p.value)));
    const max = tickVals[tickVals.length - 1];
    const stepX = pts.length > 1 ? innerW / (pts.length - 1) : 0;
    const coords = pts.map((p, i) => ({ x: l + i * stepX, y: t + innerH * (1 - p.value / max) }));
    const line = coords.map((c, i) => `${i ? 'L' : 'M'}${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ');
    const base = t + innerH;
    const area = coords.length ? `${line} L${coords[coords.length - 1].x},${base} L${coords[0].x},${base} Z` : '';
    const every = Math.max(1, Math.ceil(pts.length / Math.max(2, Math.floor(innerW / 90))));
    const xLabels = pts
      .map((p, i) => ({ i, x: coords[i].x, label: p.label }))
      .filter((_, i) => (pts.length - 1 - i) % every === 0);
    return {
      pts: coords,
      line,
      area,
      stepX,
      last: coords[coords.length - 1],
      ticks: tickVals.map((v) => ({ v, y: t + innerH * (1 - v / max) })),
      xLabels
    };
  });

  tipLeft = computed(() => {
    const i = this.hover();
    if (i < 0) return 0;
    // Keep the tooltip inside the card near either edge.
    return Math.min(this.width() - 70, Math.max(70, this.geo().pts[i].x));
  });

  onMove(event: MouseEvent): void {
    const rect = (event.currentTarget as SVGElement).getBoundingClientRect();
    const g = this.geo();
    if (!g.pts.length) return;
    const x = event.clientX - rect.left;
    const i = g.stepX ? Math.round((x - this.pad.l) / g.stepX) : 0;
    this.hover.set(Math.min(g.pts.length - 1, Math.max(0, i)));
  }
}
