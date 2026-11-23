// Production in a real browser: every page loads with no console error and no CSP
// violation. Catches what only exists in production, such as scripts Netlify injects
// (RUM) and the headers from netlify.toml. Usage: node checks/prod-console.cjs [origin]
const { chromium } = require('playwright-core');
const ORIGIN = process.argv[2] || 'https://kerbero94.dev';
const PAGES = ['/', '/sitimm/', '/accessibility/', '/sitimmvito/', '/architecture/'];
setTimeout(() => { console.error('TIMEOUT'); process.exit(2); }, 3 * 60 * 1000);
(async () => {
  const browser = await chromium.launch({ channel: 'chrome' });
  const problems = [];
  for (const path of PAGES) {
    const page = await (await browser.newContext()).newPage();
    page.on('console', (m) => { if (m.type() === 'error') problems.push(`${path} console: ${m.text().slice(0, 200)}`); });
    page.on('pageerror', (e) => problems.push(`${path} exception: ${String(e).slice(0, 200)}`));
    await page.addInitScript(() => document.addEventListener('securitypolicyviolation', (e) =>
      console.error(`CSP blocked ${e.blockedURI} (${e.violatedDirective})`)));
    await page.goto(ORIGIN + path, { waitUntil: 'networkidle' });
    await page.waitForTimeout(3000); // RUM reports after load
    await page.close();
  }
  await browser.close();
  console.log(problems.length ? problems.join('\n') : `ok   ${PAGES.length} pages, no console errors or CSP violations`);
  process.exit(problems.length ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
