// Content Security Policy with no 'unsafe-inline': every inline <script> and <style> is
// allowed by its SHA-256 hash. Run `npm run csp` after changing any inline CSS or JS; it
// rewrites the <meta> in each page and the header in netlify.toml. `--check` only verifies
// (the unit tests call it), so a stale policy fails the gate instead of breaking the site.
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
export const PAGES = ['/', '/sitimm/', '/accessibility/', '/sitimmvito/', '/architecture/'].map((p) => `${ROOT}site${p}index.html`);
const TOML = `${ROOT}netlify.toml`;
// Netlify Real User Monitoring: Netlify injects <script src="/.netlify/scripts/rum"> in
// production (same origin, covered by 'self'); it posts the metrics to this collector.
const RUM_COLLECTOR = 'https://ingesteer.services-prod.nsvcs.net';

const hash = (text) => `'sha256-${createHash('sha256').update(text, 'utf8').digest('base64')}'`;
const inline = (html, tag) => [...html.matchAll(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, 'g'))].map((m) => m[1]);

export function policy() {
  const scripts = new Set(), styles = new Set();
  for (const page of PAGES) {
    const html = readFileSync(page, 'utf8');
    inline(html, 'script').forEach((s) => scripts.add(hash(s)));
    inline(html, 'style').forEach((s) => styles.add(hash(s)));
  }
  const base = [
    "default-src 'self'",
    `script-src 'self' ${[...scripts].sort().join(' ')}`,
    `style-src 'self' ${[...styles].sort().join(' ')}`,
    "img-src 'self' data:",
    "font-src 'self'",
    "media-src 'self'",
    `connect-src 'self' ${RUM_COLLECTOR}`,
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'none'",
    // No upgrade-insecure-requests: every URL is relative and HSTS already forces HTTPS;
    // WebKit would also upgrade http://127.0.0.1 and break local and CI tests.
  ];
  // frame-ancestors only works as a header; a <meta> that carries it logs a console error.
  return { meta: base.join('; '), header: [...base, "frame-ancestors 'none'"].join('; ') };
}

const META_RE = /<meta http-equiv="Content-Security-Policy" content="[^"]*">\n/;
const HEADER_RE = /    Content-Security-Policy = "[^"]*"\n/;

export function check() {
  const { meta, header } = policy();
  const stale = PAGES.filter((p) => !readFileSync(p, 'utf8').includes(`<meta http-equiv="Content-Security-Policy" content="${meta}">`));
  if (!readFileSync(TOML, 'utf8').includes(`    Content-Security-Policy = "${header}"`)) stale.push(TOML);
  return stale.map((p) => p.slice(ROOT.length));
}

function write() {
  const { meta, header } = policy();
  const tag = `<meta http-equiv="Content-Security-Policy" content="${meta}">\n`;
  for (const page of PAGES) {
    let html = readFileSync(page, 'utf8');
    html = META_RE.test(html) ? html.replace(META_RE, tag) : html.replace('<meta charset="utf-8">\n', `<meta charset="utf-8">\n${tag}`);
    writeFileSync(page, html);
  }
  const toml = readFileSync(TOML, 'utf8');
  if (!HEADER_RE.test(toml)) throw new Error('netlify.toml has no Content-Security-Policy line to update');
  writeFileSync(TOML, toml.replace(HEADER_RE, `    Content-Security-Policy = "${header}"\n`));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  if (process.argv.includes('--check')) {
    const stale = check();
    if (stale.length) { console.error(`CSP out of date in: ${stale.join(', ')}. Run npm run csp.`); process.exit(1); }
    console.log('CSP up to date');
  } else { write(); console.log('CSP written:', check().length ? 'MISMATCH' : 'ok'); }
}
