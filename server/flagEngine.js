import { RULE_MAP } from './config.js';

export function applyRules(rawFindings) {
  return rawFindings
    .map((finding, index) => {
      const rule = RULE_MAP[finding.ruleId];
      if (!rule) {
        console.warn(`[flagEngine] Skipping finding — ruleId "${finding.ruleId}" not found in config/rules.json. Add it or check for typos.`);
        return null;
      }
      return {
        id: `flag-${index + 1}`,
        ruleId: rule.id,
        severity: rule.severity,
        sevLabel: severityLabel(rule.severity),
        clause: finding.clause || rule.section,
        title: rule.name,
        desc: finding.detail || rule.note,
        original: finding.original,
        modified: finding.modified,
        page: finding.page || 1,
      };
    })
    .filter(Boolean)
    .sort(severityOrder);
}

function severityLabel(s) {
  return { high: 'High risk', medium: 'Medium risk', low: 'Low risk', info: 'Info' }[s] ?? s;
}

function severityOrder(a, b) {
  const rank = { high: 0, medium: 1, low: 2, info: 3 };
  return (rank[a.severity] ?? 9) - (rank[b.severity] ?? 9);
}
