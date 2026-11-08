import { Component, computed, input } from '@angular/core';

/** Tiny trend line for KPI tiles — no axes, end dot only. */
@Component({
  selector: 'adm-sparkline',
  template: `
    <svg [attr.width]="width()" [attr.height]="height()" aria-hidden="true">
      <path class="area" [attr.d]="paths().area" />
      <path class="line" [attr.d]="paths().line" />
      <circle class="dot" [attr.cx]="paths().end.x" [attr.cy]="paths().end.y" r="3.5" />
    </svg>
  `,
  styles: `
    :host{display:block; line-height:0;}
    svg{overflow:visible;}
    .line{fill:none; stroke:var(--blue); stroke-width:2; stroke-linejoin:round; stroke-linecap:round;}
    .area{fill:var(--blue); opacity:.08;}
    .dot{fill:var(--blue); stroke:#fff; stroke-width:2;}
  `
})
export class SparklineComponent {
  values = input.required<number[]>();
  width = input(104);
  height = input(34);
  /** For metrics where lower is better (e.g. Google position) — draws improvement as going up. */
  invert = input(false);

  paths = computed(() => {
    const vals = this.values();
    const w = this.width();
    const h = this.height();
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const span = max - min || 1;
    const step = vals.length > 1 ? w / (vals.length - 1) : 0;
    const pts = vals.map((v, i) => {
      const norm = (v - min) / span;
      return { x: i * step, y: 3 + (h - 6) * (this.invert() ? norm : 1 - norm) };
    });
    const line = pts.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
    const end = pts[pts.length - 1] ?? { x: 0, y: h / 2 };
    return { line, area: pts.length ? `${line} L${end.x},${h} L0,${h} Z` : '', end };
  });
}
