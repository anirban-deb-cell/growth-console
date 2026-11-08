/**
 * Healthcare-advertising copy check. In the product this is the AI check
 * (healthcare-ads rulebook + Google/Meta medical-ad policies); this
 * rule-based stand-in catches the common problems so the UI can be shown
 * working. A person always approves a fix — nothing is auto-published.
 */

export interface ComplianceFinding {
  phrase: string;
  reason: string;
  suggestion: string;
}

interface Rule {
  pattern: RegExp;
  reason: string;
  suggestion: string;
}

const RULES: Rule[] = [
  { pattern: /\bguarantee(d|s)?(\s+results?)?\b/i, reason: 'Promises a result no doctor can guarantee.', suggestion: 'personalised treatment plan' },
  { pattern: /\b100\s?%\s?(success(\s?rate)?|safe|results?)?/i, reason: 'Absolute claim that can’t be verified and can get the ad disapproved.', suggestion: 'experienced team' },
  { pattern: /\bpain[- ]?free\b/i, reason: 'Implies an outcome every patient will get.', suggestion: 'Guided recovery' },
  { pattern: /\b(cure|cures|cured)\b/i, reason: 'Cure claims are restricted for medical ads.', suggestion: 'treatment options' },
  { pattern: /\b(best|no\.?\s?1|number one|#1)\b/i, reason: 'Superlatives need independent proof, and medical-council rules restrict doctors’ self-praise.', suggestion: 'experienced' },
  { pattern: /\bno side[- ]?effects?\b/i, reason: 'Absolute safety claim.', suggestion: 'discuss risks with your doctor' },
  { pattern: /\brisk[- ]?free\b/i, reason: 'Absolute safety claim.', suggestion: 'safety-first approach' },
  { pattern: /\bpermanent(ly)?\b/i, reason: 'Implies a permanent result.', suggestion: 'long-lasting for many patients' },
  { pattern: /\b(lose|lost)\s+\d+\s?(kg|kgs|kilos)\b/i, reason: 'Specific weight-loss results are restricted.', suggestion: 'a supervised weight-management plan' },
  { pattern: /\s?\bin\s+\d+\s+(hours?|days?)\b/i, reason: 'Time-bound recovery promises read as guaranteed outcomes.', suggestion: '' }
];

export function checkCompliance(text: string): ComplianceFinding[] {
  const findings: ComplianceFinding[] = [];
  for (const rule of RULES) {
    const match = (text ?? '').match(rule.pattern);
    if (match) findings.push({ phrase: match[0].trim(), reason: rule.reason, suggestion: rule.suggestion });
  }
  return findings;
}

/** Replaces each flagged phrase with its safer wording. */
export function suggestRewrite(text: string): string {
  let out = text ?? '';
  for (const rule of RULES) {
    out = out.replace(new RegExp(rule.pattern.source, 'gi'), rule.suggestion);
  }
  out = out.replace(/\s{2,}/g, ' ').replace(/\s+([.,!?])/g, '$1').trim();
  // Re-capitalise sentence starts that a replacement may have lower-cased.
  return out.replace(/(^|[.!?]\s+)([a-z])/g, (_m, lead: string, ch: string) => lead + ch.toUpperCase());
}
