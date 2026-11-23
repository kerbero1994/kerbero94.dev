// Visual regression: the first screen of every page in every style at 1280x800,
// plus every page on a phone. Baselines live in tests/visual/__screenshots__ and are
// rendered in CI on Linux; refresh them by labelling the pull request "update-visuals".
import { test, expect } from '@playwright/test';

const PAGES = { home: '/', sitimm: '/sitimm/', accessibility: '/accessibility/', sitimmvito: '/sitimmvito/', architecture: '/architecture/' };
const STYLES = ['classic', 'swiss', 'noir', 'deco', 'brutal', 'bauhaus', 'riso', 'terminal', 'blueprint', 'retro'];

async function settle(page, url) {
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
}

for (const [name, path] of Object.entries(PAGES)) {
  for (const style of STYLES) {
    test(`${name} in ${style}`, async ({ page }) => {
      await settle(page, `${path}?style=${style}`);
      await expect(page).toHaveScreenshot(`${name}-${style}.png`);
    });
  }
  test(`${name} on a phone`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await settle(page, `${path}?style=classic`);
    await expect(page).toHaveScreenshot(`${name}-phone.png`);
  });
}
