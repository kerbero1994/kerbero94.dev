// The owner's absolute design rule, checked mechanically: no coloured stripe on a side edge.
// A 1px hairline is a border, not a stripe; anything thicker on one side is banned.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PAGES, load } from './site.mjs';

const SIDE = /border-(?:left|right|inline-start|inline-end)(?:-width)?\s*:\s*([\d.]+)(px|rem|em)/g;
const INSET_BAR = /inset\s+-?[2-9]\d*px\s+0(?:px)?\s+0(?:px)?\s+0/g;

for (const path of PAGES) {
  test(`${path} has no side stripes`, () => {
    const css = [...load(path).document.querySelectorAll('style')].map((s) => s.textContent).join('\n');
    const stripes = [...css.matchAll(SIDE)].filter(([, n, unit]) => (unit === 'px' ? +n > 1 : +n > 0.0625)).map((m) => m[0]);
    assert.deepEqual(stripes, [], 'side border thicker than 1px');
    assert.deepEqual(css.match(INSET_BAR) ?? [], [], 'inset shadow standing in for a stripe');
  });
}
