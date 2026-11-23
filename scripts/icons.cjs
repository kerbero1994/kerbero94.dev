// Raster icons from site/favicon.svg, for clients that don't take SVG: favicon.ico
// (16 and 32 px PNGs inside), apple-touch-icon.png (180 px, opaque, iOS rounds it).
// Renders with the installed Chrome. Run after changing favicon.svg.
const { chromium } = require('playwright-core');
const fs = require('fs');
const path = require('path');
const SITE = path.join(__dirname, '..', 'site');
const svg = fs.readFileSync(path.join(SITE, 'favicon.svg'), 'utf8');

async function render(page, size, opaque) {
  // For the touch icon, drop the rounded corners: iOS applies its own mask.
  const art = (opaque ? svg.replace(/ rx="[\d.]+"/, '') : svg).replace('<svg ', `<svg width="${size}" height="${size}" `);
  await page.setViewportSize({ width: size, height: size });
  await page.goto(`data:image/svg+xml;base64,${Buffer.from(art).toString('base64')}`);
  return page.screenshot({ omitBackground: !opaque, clip: { x: 0, y: 0, width: size, height: size } });
}

function ico(pngs) { // ICO container holding PNG images (supported by every current browser)
  const header = Buffer.alloc(6); header.writeUInt16LE(0, 0); header.writeUInt16LE(1, 2); header.writeUInt16LE(pngs.length, 4);
  let offset = 6 + 16 * pngs.length;
  const entries = pngs.map(({ size, data }) => {
    const e = Buffer.alloc(16);
    e.writeUInt8(size % 256, 0); e.writeUInt8(size % 256, 1); e.writeUInt16LE(1, 4); e.writeUInt16LE(32, 6);
    e.writeUInt32LE(data.length, 8); e.writeUInt32LE(offset, 12); offset += data.length;
    return e;
  });
  return Buffer.concat([header, ...entries, ...pngs.map((p) => p.data)]);
}

(async () => {
  const browser = await chromium.launch({ channel: 'chrome' });
  const page = await (await browser.newContext({ deviceScaleFactor: 1 })).newPage();
  const small = [];
  for (const size of [16, 32]) small.push({ size, data: await render(page, size, false) });
  fs.writeFileSync(path.join(SITE, 'favicon.ico'), ico(small));
  fs.writeFileSync(path.join(SITE, 'apple-touch-icon.png'), await render(page, 180, true));
  await browser.close();
  for (const f of ['favicon.ico', 'apple-touch-icon.png']) console.log(f, fs.statSync(path.join(SITE, f)).size, 'bytes');
})().catch((e) => { console.error(e); process.exit(1); });
