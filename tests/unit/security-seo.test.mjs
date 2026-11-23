// Security headers, the CSP hashes, security.txt and structured data.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { check } from '../../scripts/csp.mjs';
import { ORIGIN, PAGES, SITE, load } from './site.mjs';

const toml = readFileSync(new URL('../../netlify.toml', import.meta.url), 'utf8');

test('the CSP allows exactly the inline scripts and styles on the pages (run npm run csp)', () => {
  assert.deepEqual(check(), []);
});

test('the CSP has no unsafe-inline or unsafe-eval, and frames are refused', () => {
  const csp = toml.match(/Content-Security-Policy = "([^"]*)"/)[1];
  assert.doesNotMatch(csp, /unsafe-(inline|eval)/);
  assert.match(csp, /frame-ancestors 'none'/);
  assert.match(csp, /object-src 'none'/);
  assert.match(csp, /base-uri 'none'/);
});

test('every security header is set', () => {
  for (const h of ['Strict-Transport-Security = "max-age=63072000; includeSubDomains; preload"', 'X-Content-Type-Options = "nosniff"',
    'X-Frame-Options = "DENY"', 'Referrer-Policy', 'Permissions-Policy', 'Cross-Origin-Opener-Policy = "same-origin"']) {
    assert.ok(toml.includes(h), h);
  }
});

test('security.txt has a contact and expires within the next year, not in the next 30 days', () => {
  const txt = readFileSync(join(SITE, '.well-known/security.txt'), 'utf8');
  assert.match(txt, /^Contact: mailto:eduardo@kerbero94\.dev$/m);
  const days = (new Date(txt.match(/^Expires: (.+)$/m)[1]) - Date.now()) / 86400000;
  assert.ok(days > 30 && days <= 366, `Expires is ${Math.round(days)} days away`);
});

for (const path of PAGES) {
  test(`${path} has valid structured data`, () => {
    const { document } = load(path);
    const blocks = [...document.querySelectorAll('script[type="application/ld+json"]')];
    assert.equal(blocks.length, 1);
    const data = JSON.parse(blocks[0].textContent);
    assert.equal(data['@context'], 'https://schema.org');
    assert.equal(data.url, ORIGIN + path);
    if (path === '/') {
      assert.equal(data['@type'], 'ProfilePage');
      assert.equal(data.mainEntity.name, 'Eduardo González Zavala');
      assert.ok(data.mainEntity.sameAs.length >= 2);
    } else {
      assert.equal(data['@type'], 'Article');
      assert.equal(data.headline, document.querySelector('h1').textContent.trim().replace(/\s+/g, ' '));
      assert.equal(data.author['@id'], `${ORIGIN}/#me`);
    }
  });
}
