const IN = new Intl.NumberFormat('en-IN');

/** 1,28,400 — Indian digit grouping. */
export function fmt(n: number): string {
  return IN.format(Math.round(n));
}

/** ₹1.18L / ₹38.6L / ₹4,120 — compact rupees the way Indian marketing teams read them. */
export function inr(n: number): string {
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(2)}Cr`;
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(2).replace(/\.?0+$/, '')}L`;
  return `₹${IN.format(Math.round(n))}`;
}

/** 1.92M / 38.4K for large counts. */
export function compact(n: number): string {
  if (n >= 1e6) return `${(n / 1e6).toFixed(2).replace(/\.?0+$/, '')}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1).replace(/\.0$/, '')}K`;
  return String(n);
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** 2026-09-12 → 12 Sep 2026 (string-based, so no timezone surprises). */
export function shortDate(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
}

export function slugify(value: string): string {
  return (value ?? '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}
