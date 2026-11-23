// What a visitor does: pick a style, copy the email, open the résumé, skip to content,
// jump through the video, read without JavaScript.
import { test, expect } from '@playwright/test';

const PAGES = ['/', '/sitimm/', '/accessibility/', '/sitimmvito/', '/architecture/'];
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
    await expect(page.locator('#style-picker :focus')).toHaveCount(1);
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

test('video chapters seek the tour, and the video loads nothing until asked', async ({ page }) => {
  const media = [];
  page.on('request', (r) => { if (r.url().includes('/media/')) media.push(r.url()); });
  await page.goto('/sitimm/');
  await page.waitForLoadState('networkidle');
  expect(media, 'preload="none" keeps 19 MB off the first load').toEqual([]);
  await page.getByRole('button', { name: /Discounts/ }).click();
  await expect.poll(() => page.evaluate(() => document.querySelector('.tour video').currentTime)).toBeGreaterThanOrEqual(75);
});

test('the architecture page contents link to each section', async ({ page }) => {
  await page.goto('/architecture/');
  const links = page.locator('.toc a');
  await expect(links).toHaveCount(6);
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
