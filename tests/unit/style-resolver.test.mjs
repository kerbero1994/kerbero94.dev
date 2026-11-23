// The inline script that picks the style before first paint: URL beats saved beats system.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { load, noFlashScript } from './site.mjs';

const SCRIPT = noFlashScript(load('/').document);

function resolve({ search = '', saved = null, dark = false, storageThrows = false } = {}) {
  const el = { dataset: {} };
  vm.runInNewContext(SCRIPT, {
    URLSearchParams,
    location: { search },
    localStorage: { getItem: () => { if (storageThrows) throw new Error('blocked'); return saved; } },
    matchMedia: (q) => ({ matches: q.includes('dark') && dark }),
    document: { currentScript: { parentNode: el } },
  });
  return el.dataset;
}

test('no choice follows the system: light is classic', () => assert.deepEqual({ ...resolve() }, { choice: 'auto', style: 'classic' }));
test('no choice follows the system: dark is noir', () => assert.deepEqual({ ...resolve({ dark: true }) }, { choice: 'auto', style: 'noir' }));
test('a saved style wins over the system', () => assert.deepEqual({ ...resolve({ saved: 'riso', dark: true }) }, { choice: 'riso', style: 'riso' }));
test('?style= wins over a saved style', () => assert.deepEqual({ ...resolve({ search: '?style=retro', saved: 'riso' }) }, { choice: 'retro', style: 'retro' }));
test('an unknown ?style= is ignored', () => assert.deepEqual({ ...resolve({ search: '?style=comic', saved: 'swiss' }) }, { choice: 'swiss', style: 'swiss' }));
test('an unknown saved value is ignored', () => assert.deepEqual({ ...resolve({ saved: 'comic' }) }, { choice: 'auto', style: 'classic' }));
test('blocked storage (private mode) still renders', () => assert.deepEqual({ ...resolve({ storageThrows: true, dark: true }) }, { choice: 'auto', style: 'noir' }));
