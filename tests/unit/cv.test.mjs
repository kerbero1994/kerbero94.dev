// The résumé PDF: same text as its source (cv/cv.html), tagged with a language so screen
// readers can read it, and the size the button announces is the real one. If cv.html
// changes, regenerate the PDF with scripts/cv.sh.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { parseHTML } from 'linkedom';
import { load } from './site.mjs';

const PDF = new URL('../../site/eduardo-gonzalez-cv.pdf', import.meta.url);
const SOURCE = new URL('../../cv/cv.html', import.meta.url);
// Letters and digits only: PDF extraction splits ligatures (fi, ffl) and the DOM joins
// adjacent elements without spaces, so whitespace and punctuation can't be compared.
const letters = (s) => s.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');

test('the PDF has the same text as cv/cv.html (run scripts/cv.sh after editing it)', async () => {
  const pdf = await getDocument({ data: new Uint8Array(readFileSync(PDF)), verbosity: 0 }).promise;
  let text = '';
  for (let i = 1; i <= pdf.numPages; i++) text += (await (await pdf.getPage(i)).getTextContent()).items.map((x) => x.str).join(' ');
  const { document } = parseHTML(readFileSync(SOURCE, 'utf8'));
  document.querySelectorAll('style, script').forEach((e) => e.remove());
  assert.equal(letters(text), letters(document.body.textContent));
  assert.equal(pdf.numPages, 1, 'one page');
});

test('the PDF is tagged and declares its language', () => {
  const raw = readFileSync(PDF, 'latin1');
  assert.ok(raw.includes('/StructTreeRoot'), 'tagged (structure tree)');
  assert.match(raw, /\/Lang\s*\(en/, 'language: English');
});

test('the résumé button states the real file size', () => {
  const kb = Math.round(statSync(PDF).size / 1024);
  const labels = [...load('/').document.querySelectorAll('a[href="/eduardo-gonzalez-cv.pdf"] .meta')].map((e) => e.textContent.replace(/\s+/g, ' '));
  assert.ok(labels.length > 0);
  for (const l of labels) assert.equal(l, `PDF, ${kb} KB`);
});
