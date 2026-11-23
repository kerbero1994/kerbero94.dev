// Turns the Lighthouse CI manifest into a markdown table: median run per page.
// Usage: node checks/lh-summary.mjs [.lighthouseci/reports] >> "$GITHUB_STEP_SUMMARY"
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const dir = process.argv[2] || '.lighthouseci/reports';
const runs = JSON.parse(readFileSync(join(dir, 'manifest.json'), 'utf8')).filter((r) => r.isRepresentativeRun);
const pct = (n) => Math.round(n * 100);
const audit = (lhr, id) => lhr.audits[id]?.displayValue ?? '';

console.log('| Page | Performance | Accessibility | Best practices | SEO | LCP | CLS | TBT | Weight |');
console.log('|---|---:|---:|---:|---:|---:|---:|---:|---:|');
for (const run of runs.sort((a, b) => a.url.localeCompare(b.url))) {
  const lhr = JSON.parse(readFileSync(run.jsonPath, 'utf8'));
  const s = run.summary;
  console.log(`| ${new URL(run.url).pathname} | ${pct(s.performance)} | ${pct(s.accessibility)} | ${pct(s['best-practices'])} | ${pct(s.seo)} | ${audit(lhr, 'largest-contentful-paint')} | ${audit(lhr, 'cumulative-layout-shift')} | ${audit(lhr, 'total-blocking-time')} | ${audit(lhr, 'total-byte-weight')} |`);
}
