// The quality report a bot keeps on each pull request: one comment, updated on every push.
// Reads the results every gate job uploads (artifacts downloaded into ARTIFACTS) and each
// job's conclusion from the GitHub API, then creates or edits the comment that carries
// MARKER. `--dry` prints the markdown instead (local check).
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { basename, join } from 'node:path';

const { GH_TOKEN, REPO, PR, RUN_ID, SHA, PREVIEW_URL = '', PREVIEW_RESULT = '', ARTIFACTS = 'artifacts' } = process.env;
const DRY = process.argv.includes('--dry');
const MARKER = '<!-- quality-report -->';
const api = async (path, init = {}) => {
  const r = await fetch(`https://api.github.com${path}`, { ...init, headers: { authorization: `Bearer ${GH_TOKEN}`, accept: 'application/vnd.github+json', 'content-type': 'application/json', ...init.headers } });
  if (!r.ok) throw new Error(`${init.method || 'GET'} ${path}: ${r.status} ${await r.text()}`);
  return r.json();
};

// artifact name -> { file name -> full path }, searching each artifact folder recursively
const files = {};
const walk = (dir, out) => { for (const f of readdirSync(dir)) { const p = join(dir, f); statSync(p).isDirectory() ? walk(p, out) : (out[f] ??= p); } return out; };
if (existsSync(ARTIFACTS)) for (const a of readdirSync(ARTIFACTS)) files[a] = walk(join(ARTIFACTS, a), {});
const read = (artifact, name, parse = JSON.parse) => { const p = files[artifact]?.[name]; return p ? parse(readFileSync(p, 'utf8')) : null; };

const icon = (c) => ({ success: '✅', failure: '❌', cancelled: '⏹️', skipped: '⏭️' })[c] ?? '⏳';
const jobs = DRY ? [] : (await api(`/repos/${REPO}/actions/runs/${RUN_ID}/jobs?per_page=100`)).jobs;
const job = (name) => jobs.find((j) => j.name === `gate / ${name}`) ?? { conclusion: DRY ? 'success' : 'missing', html_url: '' };
const cell = (name) => { const j = job(name); return j.html_url ? `[${icon(j.conclusion)}](${j.html_url})` : icon(j.conclusion); };

const rows = [];
const row = (layer, name, detail) => rows.push({ layer, name, detail });

const leaks = read('result-secrets', 'gitleaks.json');
row('Secrets', 'no secrets in the history', leaks ? `${leaks.length} findings across the whole history (gitleaks)` : 'no result');

const html = read('result-static', 'html.json');
const unit = read('result-static', 'unit.xml', (s) => ({ total: (s.match(/<testcase/g) || []).length, failed: (s.match(/<failure/g) || []).length }));
const spell = read('result-static', 'spell.txt', (s) => (s.match(/Unknown word/g) || []).length);
row('Static', 'HTML validity, unit tests, CSP, spelling', [
  html ? `HTML: ${html.reduce((n, r) => n + (r.errorCount || 0), 0)} errors` : 'HTML: no result',
  unit ? `unit: ${unit.total - unit.failed}/${unit.total} passed` : 'unit: no result',
  spell !== null ? `spelling: ${spell} unknown words` : 'spelling: no result',
].join(' · '));

const a11y = read('result-a11y', 'result.json');
if (a11y) {
  const failing = a11y.axe.filter((r) => r.v.length).length;
  const aaa = (a11y.aaa || []).reduce((n, r) => n + r.nodes, 0);
  row('Accessibility', 'axe, 5 pages x 10 styles', `AA: ${a11y.axe.length - failing}/${a11y.axe.length} runs clean · AAA contrast: ${aaa} elements below 7:1 · overflow at 390/320 px: ${a11y.overflow.length} · broken links: ${(a11y.links || []).length} · console errors: ${a11y.console.length}`);
} else row('Accessibility', 'axe, 5 pages x 10 styles', 'no result');

const pw = (artifact, file) => {
  const r = read(artifact, file); if (!r) return 'no result';
  const s = r.stats; const ran = s.expected + s.unexpected + s.flaky;
  return `${s.expected + s.flaky}/${ran} passed${s.flaky ? `, ${s.flaky} flaky` : ''}${s.skipped ? `, ${s.skipped} skipped` : ''} · ${Math.round(s.duration / 1000)} s`;
};
for (const [p, label] of [['chrome', 'Chrome'], ['firefox', 'Firefox'], ['webkit-iphone', 'WebKit, iPhone']]) row(`E2E · ${label}`, `e2e (${p})`, pw(`result-e2e-${p}`, `e2e-${p}.json`));
row('Visual regression', 'visual regression, 57 screens', pw('result-visual', 'visual.json').replace('passed', 'screens match'));

const lh = {};
for (const form of ['mobile', 'desktop']) {
  const manifest = read(`result-lighthouse-${form}`, 'manifest.json');
  if (!manifest) { row(`Lighthouse · ${form}`, `Lighthouse budgets (${form})`, 'no result'); continue; }
  const reps = manifest.filter((r) => r.isRepresentativeRun).sort((a, b) => a.url.localeCompare(b.url));
  lh[form] = reps.map((r) => {
    const lhr = read(`result-lighthouse-${form}`, basename(r.jsonPath));
    const a = (id) => lhr?.audits[id]?.displayValue ?? '';
    const sc = (k) => Math.round(r.summary[k] * 100);
    return { page: new URL(r.url).pathname, perf: sc('performance'), a11y: sc('accessibility'), bp: sc('best-practices'), seo: sc('seo'), lcp: a('largest-contentful-paint'), cls: a('cumulative-layout-shift'), tbt: a('total-blocking-time') };
  });
  const min = (k) => Math.min(...lh[form].map((p) => p[k]));
  row(`Lighthouse · ${form}`, `Lighthouse budgets (${form})`, `lowest page: performance ${min('perf')} · accessibility ${min('a11y')} · best practices ${min('bp')} · SEO ${min('seo')}`);
}

const passed = rows.filter((r) => job(r.name).conclusion === 'success').length;
const preview = PREVIEW_RESULT === 'success' && PREVIEW_URL ? `🔎 **Preview:** ${PREVIEW_URL}` : PREVIEW_RESULT ? `🔎 **Preview:** ${icon(PREVIEW_RESULT)} not deployed (${PREVIEW_RESULT})` : '';
const runUrl = `https://github.com/${REPO}/actions/runs/${RUN_ID}`;
const lhTable = (form) => !lh[form] ? '' : [`**${form}**`, '', '| Page | Perf | A11y | Best pr. | SEO | LCP | CLS | TBT |', '|---|---:|---:|---:|---:|---:|---:|---:|',
  ...lh[form].map((p) => `| ${p.page} | ${p.perf} | ${p.a11y} | ${p.bp} | ${p.seo} | ${p.lcp} | ${p.cls} | ${p.tbt} |`), ''].join('\n');

const body = [
  MARKER,
  `## Quality report · \`${(SHA || 'local').slice(0, 7)}\``,
  '',
  `${passed === rows.length ? '✅' : '❌'} **${passed}/${rows.length} checks passed**${preview ? ` · ${preview}` : ''}`,
  '',
  '| Layer | | Result |',
  '|---|:---:|---|',
  ...rows.map((r) => `| ${r.layer} | ${cell(r.name)} | ${r.detail} |`),
  '',
  '<details><summary>Lighthouse per page (median of 3 runs)</summary>',
  '',
  lhTable('mobile'),
  lhTable('desktop'),
  '</details>',
  '',
  `<sub>[Run](${runUrl}) · artifacts hold the full reports · updated on every push</sub>`,
].join('\n');

if (DRY) { console.log(body); process.exit(0); }
const comments = await api(`/repos/${REPO}/issues/${PR}/comments?per_page=100`);
const mine = comments.find((c) => c.user.type === 'Bot' && c.body.startsWith(MARKER));
if (mine) await api(`/repos/${REPO}/issues/comments/${mine.id}`, { method: 'PATCH', body: JSON.stringify({ body }) });
else await api(`/repos/${REPO}/issues/${PR}/comments`, { method: 'POST', body: JSON.stringify({ body }) });
console.log(`${mine ? 'Updated' : 'Created'} the quality report on #${PR}`);
