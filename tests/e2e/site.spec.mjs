// What a visitor does: pick a style, copy the email, open the résumé, skip to content,
// jump through the video, read without JavaScript.
import { test, expect } from '@playwright/test';

const PAGES = ['/', '/sitimm/', '/accessibility/', '/sitimmvito/', '/architecture/'];
const STYLES = ['classic', 'swiss', 'noir', 'deco', 'brutal', 'bauhaus', 'riso', 'terminal', 'blueprint', 'retro'];

// Any console error or uncaught exception fails the test: that includes CSP violations,
// which is how a stale hash would show up in a browser.
let errors;
test.beforeEach(({ page }) => {
  errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(String(e)));
});
test.afterEach(() => expect(errors, 'console errors').toEqual([]));
const site = (page) => page.locator('#site');
const pick = (page, value) => page.locator(`label.opt:has(input[value="${value}"])`).click();

test.describe('style picker', () => {
  test('choosing a style applies it, announces it, and keeps it across pages', async ({ page }) => {
    await page.goto('/');
    await page.locator('.style-btn').click();
    await expect(page.locator('#style-picker')).toBeVisible();
    await pick(page, 'noir');
    await expect(site(page)).toHaveAttribute('data-style', 'noir');
    await expect(page).toHaveURL(/[?&]style=noir/);
    await expect(page.locator('#style-status')).toHaveText('Style: Noir');
    await page.goto('/architecture/');
    await expect(site(page)).toHaveAttribute('data-style', 'noir');
  });

  test('?style= in a shared link wins over the saved style', async ({ page }) => {
    await page.goto('/');
    await page.locator('.style-btn').click();
    await pick(page, 'swiss');
    await page.goto('/sitimm/?style=retro');
    await expect(site(page)).toHaveAttribute('data-style', 'retro');
  });

  test('"Match my system" follows the OS, live', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto('/');
    await expect(site(page)).toHaveAttribute('data-style', 'noir');
    await expect(site(page)).toHaveAttribute('data-choice', 'auto');
    await page.emulateMedia({ colorScheme: 'light' });
    await expect(site(page)).toHaveAttribute('data-style', 'classic');
  });

  test('keyboard: Enter opens, Tab goes in, Escape closes and returns focus', async ({ page, isMobile }) => {
    test.skip(isMobile, 'no hardware keyboard on the phone profile');
    await page.goto('/');
    const button = page.locator('.style-btn');
    await button.focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('#style-picker')).toBeVisible();
    await page.keyboard.press('Tab');
    // Firefox stops first on the picker itself (a scrollable container); others on the first radio.
    await expect(page.locator('#style-picker:focus, #style-picker :focus')).toHaveCount(1);
    await page.keyboard.press('Escape');
    await expect(page.locator('#style-picker')).toBeHidden();
    await expect(button).toBeFocused();
  });
});

test('copy email shows a status message, and copies in Chrome', async ({ page, context, browserName }) => {
  if (browserName === 'chromium') await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto('/');
  await page.locator('[data-copy]').first().click();
  // Engines that refuse the clipboard get the fallback, which still shows the address.
  await expect(page.getByRole('status').filter({ hasText: /Email copied\.|eduardo@kerbero94\.dev/ })).toHaveCount(1);
  if (browserName === 'chromium') expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('eduardo@kerbero94.dev');
});

test('the résumé button serves the PDF', async ({ page, request }) => {
  await page.goto('/');
  const href = await page.getByRole('link', { name: /Résumé/ }).first().getAttribute('href');
  const res = await request.get(href);
  expect(res.status()).toBe(200);
  expect(res.headers()['content-type']).toContain('application/pdf');
});

test('the skip link moves the next Tab into the main content', async ({ page, isMobile, browserName }) => {
  test.skip(isMobile || browserName === 'webkit', 'Tab to links is a Safari preference');
  await page.goto('/sitimm/');
  await page.keyboard.press('Tab');
  await expect(page.locator('.skip')).toBeFocused();
  await page.keyboard.press('Enter');
  await page.keyboard.press('Tab');
  await expect(page.locator('main :focus')).toHaveCount(1);
});

test('video chapters seek the tour, and the video loads nothing until asked', async ({ page, browserName }) => {
  const media = [];
  page.on('request', (r) => { if (r.url().includes('/media/')) media.push(r.url()); });
  await page.goto('/sitimm/');
  await page.waitForLoadState('networkidle');
  // Playwright's WebKit is the Linux port, which fetches media despite preload="none";
  // Safari on iOS doesn't. The promise is checked where the engine keeps it.
  if (browserName !== 'webkit') expect(media, 'preload="none" keeps 19 MB off the first load').toEqual([]);
  await page.getByRole('button', { name: /Discounts/ }).click();
  await expect.poll(() => page.evaluate(() => document.querySelector('.tour video').currentTime)).toBeGreaterThanOrEqual(75);
});

test('the architecture page contents link to each section', async ({ page }) => {
  await page.goto('/architecture/');
  const links = page.locator('.toc a');
  await expect(links).toHaveCount(7);
  await links.nth(3).click();
  await expect(page).toHaveURL(/#h-ci$/);
  await expect(page.locator('#h-ci')).toBeInViewport();
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });
  for (const path of PAGES) {
    test(`${path} reads fine and hides the style button`, async ({ page }) => {
      await page.goto(path);
      await expect(page.locator('h1')).toBeVisible();
      await expect(page.locator('.style-btn')).toBeHidden();
      await expect(page.locator('main')).toContainText(/\w{40,}|\w+ \w+ \w+/);
    });
  }
});

test.describe('motion', () => {
  test('with reduced motion: no transitions and no view transition', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    expect(await page.locator('.style-btn .sw').evaluate((e) => getComputedStyle(e).transitionDuration)).toBe('0s');
    await page.locator('.style-btn').click();
    await pick(page, 'riso');
    expect(await page.evaluate(() => document.documentElement.dataset.vt)).toBeUndefined();
    await expect(site(page)).toHaveAttribute('data-style', 'riso');
  });

  test('without the preference, the style button animates', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto('/');
    expect(await page.locator('.style-btn .sw').evaluate((e) => getComputedStyle(e).transitionDuration)).not.toBe('0s');
  });
});

test('focus is visible in every style', async ({ page, browserName, isMobile }) => {
  test.skip(isMobile || browserName === 'webkit', 'Tab to links is a Safari preference');
  for (const style of STYLES) {
    await page.goto(`/?style=${style}`);
    for (const target of ['.skip', '.top .name']) {
      await page.keyboard.press('Tab');
      await expect(page.locator(target), `${style}: Tab reaches ${target}`).toBeFocused();
      const ring = await page.locator(target).evaluate((e) => {
        const c = getComputedStyle(e);
        return { outline: c.outlineStyle !== 'none' && parseFloat(c.outlineWidth) >= 2, shadow: c.boxShadow !== 'none' };
      });
      expect(ring.outline || ring.shadow, `${style}: ${target} shows a focus ring`).toBe(true);
    }
  }
});

test.describe('accessibility tree', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'one engine is enough for the tree');
  test('header and navigation', async ({ page }) => {
    await page.goto('/architecture/');
    await expect(page.locator('header.top')).toMatchAriaSnapshot({ name: 'header.aria.yml' });
  });
  test('the style picker, open', async ({ page }) => {
    await page.goto('/');
    await page.locator('.style-btn').click();
    await expect(page.locator('#style-picker')).toMatchAriaSnapshot({ name: 'picker.aria.yml' });
  });
  test('the footer', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.foot')).toMatchAriaSnapshot({ name: 'footer.aria.yml' });
  });
});
