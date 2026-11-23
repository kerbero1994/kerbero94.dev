// Page contract: what every page must have for search, sharing, and keyboard users.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ORIGIN, PAGES, SITE, load } from './site.mjs';

// '/a/b/?x#y' -> file under site/
const fileFor = (href) => {
  const path = href.split('#')[0].split('?')[0];
  return join(SITE, path.endsWith('/') ? `${path}index.html` : path);
};

for (const path of PAGES) {
  test(`${path} has the page contract`, () => {
    const { document } = load(path);
    const meta = (sel) => document.querySelector(sel)?.getAttribute('content');

    assert.equal(document.documentElement.getAttribute('lang'), 'en');
    assert.ok(document.title.trim(), 'title');
    const desc = meta('meta[name=description]');
    assert.ok(desc && desc.length >= 50 && desc.length <= 170, `description is ${desc?.length} chars`);

    const canonical = document.querySelector('link[rel=canonical]')?.getAttribute('href');
    assert.equal(canonical, ORIGIN + path);
    assert.equal(meta('meta[property="og:url"]'), canonical);
    assert.equal(meta('meta[property="og:title"]'), document.title);
    const ogImage = meta('meta[property="og:image"]');
    assert.ok(ogImage?.startsWith(`${ORIGIN}/`), 'og:image is absolute');
    assert.ok(existsSync(fileFor(ogImage.slice(ORIGIN.length))), 'og:image file exists');

    assert.equal(document.querySelectorAll('h1').length, 1, 'exactly one h1');
    assert.equal(document.querySelector('.skip')?.getAttribute('href'), '#main');
    assert.ok(document.getElementById('main'), '#main exists');

    const ids = [...document.querySelectorAll('[id]')].map((e) => e.id);
    assert.deepEqual(ids.filter((id, i) => ids.indexOf(id) !== i), [], 'ids are unique');

    for (const pic of document.querySelectorAll('picture')) {
      const types = [...pic.querySelectorAll('source')].map((x) => x.getAttribute('type'));
      assert.deepEqual(types, ['image/avif', 'image/webp'], 'AVIF first, then WebP, then the img fallback');
      for (const src of pic.querySelectorAll('source')) {
        assert.ok(src.getAttribute('sizes'), 'every source has sizes');
        const widths = src.getAttribute('srcset').split(',').map((c) => c.trim().split(/\s+/)[1]);
        assert.equal(new Set(widths).size, widths.length, `no repeated width in ${src.getAttribute('srcset').slice(0, 40)}`);
      }
    }
    assert.equal(document.querySelectorAll('main img').length, document.querySelectorAll('main picture img').length, 'every image is responsive');
    for (const img of document.querySelectorAll('img')) {
      assert.ok(img.hasAttribute('alt'), `alt on ${img.getAttribute('src')}`);
      assert.ok(img.getAttribute('width') && img.getAttribute('height'), `size on ${img.getAttribute('src')}`);
    }
  });

  test(`${path} links only to files that exist`, () => {
    const { document } = load(path);
    const refs = [
      ...[...document.querySelectorAll('a[href^="/"]')].map((a) => a.getAttribute('href')),
      ...[...document.querySelectorAll('[src^="/"], [poster^="/"]')].map((e) => e.getAttribute('src') || e.getAttribute('poster')),
      ...[...document.querySelectorAll('[srcset]')].flatMap((e) => e.getAttribute('srcset').split(',').map((c) => c.trim().split(/\s+/)[0])),
      ...[...document.querySelectorAll('link[rel=preload][href^="/"]')].map((l) => l.getAttribute('href')),
    ];
    const missing = refs.filter((r) => !r.startsWith('//') && !existsSync(fileFor(r)));
    assert.deepEqual(missing, []);
    for (const a of document.querySelectorAll('a[href^="#"]')) {
      const id = a.getAttribute('href').slice(1);
      if (id) assert.ok(document.getElementById(id), `in-page target #${id}`);
    }
  });
}

test('titles are unique', () => {
  const titles = PAGES.map((p) => load(p).document.title);
  assert.equal(new Set(titles).size, titles.length);
});

test('every page is in the nav, the sitemap, and nothing else is', () => {
  const sitemap = readFileSync(join(SITE, 'sitemap.xml'), 'utf8');
  const locs = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map((m) => m[1]);
  assert.deepEqual(locs.sort(), PAGES.map((p) => ORIGIN + p).sort());
  assert.match(readFileSync(join(SITE, 'robots.txt'), 'utf8'), /^Sitemap: https:\/\/kerbero94\.dev\/sitemap\.xml$/m);
  for (const p of PAGES) {
    const nav = load(p).document.querySelector('nav[aria-label=Main]');
    assert.ok(nav.querySelector('a[href="/architecture/"]'), `${p} links Architecture`);
  }
  const current = load('/architecture/').document.querySelector('nav [aria-current=page]');
  assert.equal(current?.getAttribute('href'), '/architecture/');
});
