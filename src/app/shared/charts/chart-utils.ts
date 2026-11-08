import { isPlatformBrowser } from '@angular/common';
import { DestroyRef, ElementRef, PLATFORM_ID, Signal, afterNextRender, inject, signal } from '@angular/core';

/** Rounds a raw step up to 1 / 2 / 2.5 / 5 × 10ⁿ so axis ticks land on clean numbers. */
export function niceStep(raw: number): number {
  if (raw <= 0) return 1;
  const pow = Math.pow(10, Math.floor(Math.log10(raw)));
  const f = raw / pow;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * pow;
}

/** Ticks from 0 to a clean max covering `max`, roughly `count` intervals. */
export function niceTicks(max: number, count = 4): number[] {
  const step = niceStep(max / count);
  const top = Math.max(step, Math.ceil(max / step) * step);
  const ticks: number[] = [];
  for (let v = 0; v <= top + step / 2; v += step) ticks.push(v);
  return ticks;
}

const compact = new Intl.NumberFormat('en-IN', { notation: 'compact', maximumFractionDigits: 1 });
const full = new Intl.NumberFormat('en-IN');

export function formatCompact(v: number): string {
  return Math.abs(v) >= 1000 ? compact.format(v) : full.format(v);
}

export function formatFull(v: number): string {
  return full.format(v);
}

/**
 * Tracks an element's rendered width so SVG charts draw at real pixel size
 * (crisp 1px gridlines, undistorted text) instead of a stretched viewBox.
 * Falls back to `fallback` during prerender, where there's no layout.
 */
export function observeWidth(el: Signal<ElementRef<HTMLElement>>, fallback = 640): Signal<number> {
  const width = signal(fallback);
  const platformId = inject(PLATFORM_ID);
  const destroyRef = inject(DestroyRef);
  if (!isPlatformBrowser(platformId)) return width;

  afterNextRender(() => {
    const node = el().nativeElement;
    width.set(node.clientWidth || fallback);
    const ro = new ResizeObserver((entries) => {
      const w = Math.round(entries[0].contentRect.width);
      if (w > 0) width.set(w);
    });
    ro.observe(node);
    destroyRef.onDestroy(() => ro.disconnect());
  });
  return width;
}
