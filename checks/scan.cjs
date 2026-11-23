// axe 4.14 on 5 pages x 10 styles (+ the open style picker), broken requests, console errors,
// horizontal overflow at 390 and 320 px (WCAG 1.4.10 reflow), internal links, AAA contrast
// (7:1, color-contrast-enhanced) in every style, and the social preview image.
// Usage: node scan.cjs <origin> <out.json> [og.png]. Exits 1 on any finding, so CI can gate on it.
const { chromium } = require('playwright-core');
const fs = require('fs');
const AXE = fs.readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
const [ORIGIN, OUT, OG] = process.argv.slice(2);
const PAGES = ['/', '/sitimm/', '/accessibility/', '/sitimmvito/', '/architecture/'];
const STYLES = ['classic', 'swiss', 'noir', 'deco', 'brutal', 'bauhaus', 'riso', 'terminal', 'blueprint', 'retro'];
const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
setTimeout(() => { console.error('TIMEOUT global'); process.exit(2); }, 10 * 60 * 1000);

const axe = (page, include, rules) => page.evaluate(async ([src, tags, inc, only]) => {
  if (!window.axe) eval(src);
  const r = await window.axe.run(inc ? { include: [inc] } : document, { runOnly: only ? { type: 'rule', values: only } : { type: 'tag', values: tags } });
  return r.violations.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length,
    sample: v.nodes.slice(0, 4).map((n) => ({ t: n.target.join(' '), why: (n.failureSummary || '').replace(/\s+/g, ' ').slice(0, 200) })) }));
}, [AXE, TAGS, include, rules]);

(async () => {
  const browser = await chromium.launch({ channel: 'chrome' });
  const out = { axe: [], broken: new Set(), console: [], overflow: [], links: [], aaa: [] };
  const hrefs = new Set();
  for (const [w, h] of [[1280, 800], [390, 844], [320, 640]]) {
    const ctx = await browser.newContext({ viewport: { width: w, height: h }, reducedMotion: 'reduce' });
    for (const style of STYLES) for (const path of PAGES) {
      const page = await ctx.newPage();
      page.on('response', (r) => { if (r.status() >= 400) out.broken.add(`${r.status()} ${r.url()}`); });
      page.on('console', (m) => { if (m.type() === 'error') out.console.push(`${style} ${path}: ${m.text().slice(0, 160)}`); });
      page.on('pageerror', (e) => out.console.push(`${style} ${path}: ${String(e).slice(0, 160)}`));
      await page.goto(`${ORIGIN}${path}?style=${style}`, { waitUntil: 'networkidle' });
      await page.evaluate(() => document.fonts.ready);
      if (w === 1280) {
        if (style === STYLES[0]) for (const h of await page.$$eval('a[href^="/"]', (as) => as.map((a) => a.getAttribute('href').split('#')[0]))) hrefs.add(h);
        const v = await axe(page);
        out.axe.push({ style, path, v });
        const aaa = await axe(page, null, ['color-contrast-enhanced']);
        out.aaa.push({ style, path, nodes: aaa.reduce((n, x) => n + x.nodes, 0) });
        if (path === '/') {
          await page.click('.style-btn');
          await page.waitForTimeout(300);
          out.axe.push({ style, path: '/ (picker open)', v: await axe(page, '#style-picker') });
        }
      } else {
        const o = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        if (o > 0) out.overflow.push({ style, path, width: w, px: o });
      }
      await page.close();
    }
    await ctx.close();
  }
  const linkCtx = await browser.newContext();
  for (const h of hrefs) {
    const r = await linkCtx.request.get(`${ORIGIN}${h}`);
    if (r.status() >= 400) out.links.push(`${r.status()} ${h}`);
  }
  await linkCtx.close();
  if (OG) {
    const ctx = await browser.newContext({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
    const page = await ctx.newPage();
    await page.goto(`${ORIGIN}/?style=classic`, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: OG });
  }
  await browser.close();
  out.broken = [...out.broken];
  fs.writeFileSync(OUT, JSON.stringify(out, null, 1));
  const bad = out.axe.filter((r) => r.v.length);
  console.log('axe runs', out.axe.length, 'with violations', bad.length);
  for (const r of bad) console.log(' ', r.style, r.path, r.v.map((v) => `${v.id}(${v.impact})x${v.nodes}`).join(' '));
  console.log('broken', out.broken.length, out.broken.slice(0, 10));
  console.log('console errors', out.console.length, out.console.slice(0, 10));
  console.log('overflow at 390 and 320px', JSON.stringify(out.overflow));
  const aaaByStyle = Object.fromEntries(STYLES.map((st) => [st, out.aaa.filter((r) => r.style === st).reduce((n, r) => n + r.nodes, 0)]));
  const aaaFails = Object.values(aaaByStyle).reduce((a, b) => a + b, 0);
  console.log('AAA contrast (7:1), elements below it per style:', JSON.stringify(aaaByStyle));
  console.log('internal links', hrefs.size, 'broken', JSON.stringify(out.links));
  process.exit(bad.length || aaaFails || out.broken.length || out.console.length || out.overflow.length || out.links.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
