// Each page carries its own copy of the header, style picker, footer and scripts.
// These tests catch the copies drifting apart (the Retro swatch fix touched five files).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PAGES, load, noFlashScript } from './site.mjs';

const pages = PAGES.map((p) => ({ p, ...load(p) }));
const same = (pick, list = pages) => {
  const [first, ...rest] = list;
  for (const page of rest) assert.equal(pick(page), pick(first), `${page.p} differs from ${first.p}`);
};

// The home page adds a "Did you know?" line to the picker; the rest must match.
test('the style picker is the same on every page', () => same(({ document }) => {
  const picker = document.getElementById('style-picker').cloneNode(true);
  picker.querySelector('#style-fact')?.remove();
  return picker.outerHTML.replace(/\s+</g, '<');
}));
test('the footer is the same on every page', () => same(({ document }) => document.querySelector('.foot').outerHTML));
test('the no-flash style script is the same on every page', () => same(({ document }) => noFlashScript(document)));
test('the case pages share one main script', () => same(
  ({ document }) => [...document.querySelectorAll('script')].at(-1).textContent,
  pages.filter(({ p }) => p !== '/'),
));
test('the header differs only in which link is current', () => same(
  ({ document }) => document.querySelector('header.top').outerHTML.replace(/ aria-current="page"/g, '').replace('href="#work"', 'href="/#work"'),
));
