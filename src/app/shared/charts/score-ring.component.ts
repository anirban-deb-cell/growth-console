import { Component, computed, input } from '@angular/core';

/** 0–100 score ring. Status color always ships with a text label, never color alone. */
@Component({
  selector: 'adm-score-ring',
  template: `
    <div class="ring" [style.width.px]="size()" [style.height.px]="size()">
      <svg [attr.width]="size()" [attr.height]="size()" [attr.viewBox]="'0 0 ' + size() + ' ' + size()" aria-hidden="true">
        <circle class="track" [attr.cx]="c()" [attr.cy]="c()" [attr.r]="radius()" [attr.stroke-width]="stroke()" />
        <circle class="value" [attr.cx]="c()" [attr.cy]="c()" [attr.r]="radius()" [attr.stroke-width]="stroke()"
          [attr.stroke]="status().color" [attr.stroke-dasharray]="dash()" [attr.transform]="'rotate(-90 ' + c() + ' ' + c() + ')'" />
      </svg>
      <div class="center">
        <b [style.font-size.px]="size() * 0.27">{{ score() }}</b>
        @if (showLabel()) {
          <span>{{ status().label }}</span>
        }
      </div>
    </div>
  `,
  styles: `
    :host{display:inline-block;}
    .ring{position:relative;}
    .track{fill:none; stroke:var(--paper-alt);}
    .value{fill:none; stroke-linecap:round; transition:stroke-dasharray .6s cubic-bezier(.2,.7,.2,1);}
    .center{position:absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center; line-height:1;}
    .center b{font-family:'Manrope',sans-serif; font-weight:800; color:var(--ink);}
    .center span{font-family:'IBM Plex Mono',monospace; font-size:10px; letter-spacing:.06em; text-transform:uppercase; color:var(--muted); margin-top:5px;}
  `
})
export class ScoreRingComponent {
  score = input.required<number>();
  size = input(120);
  showLabel = input(true);

  stroke = computed(() => Math.max(5, Math.round(this.size() * 0.08)));
  c = computed(() => this.size() / 2);
  radius = computed(() => this.size() / 2 - this.stroke() / 2 - 1);
  dash = computed(() => {
    const circ = 2 * Math.PI * this.radius();
    const v = Math.max(0, Math.min(100, this.score())) / 100;
    return `${(circ * v).toFixed(1)} ${circ.toFixed(1)}`;
  });
  status = computed(() => scoreStatus(this.score()));
}

export function scoreStatus(score: number): { label: string; color: string; tone: 'good' | 'warn' | 'bad' } {
  if (score >= 85) return { label: 'Good', color: '#237C35', tone: 'good' };
  if (score >= 65) return { label: 'Needs work', color: '#B26A00', tone: 'warn' };
  return { label: 'Poor', color: '#B3261E', tone: 'bad' };
}
