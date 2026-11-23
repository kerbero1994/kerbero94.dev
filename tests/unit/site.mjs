// Shared helpers for the browserless tests: the pages, and a DOM for each.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseHTML } from 'linkedom';

export const SITE = new URL('../../site/', import.meta.url).pathname;
export const ORIGIN = 'https://kerbero94.dev';
export const PAGES = ['/', '/sitimm/', '/accessibility/', '/sitimmvito/', '/architecture/'];

export function load(path) {
  const html = readFileSync(join(SITE, path, 'index.html'), 'utf8');
  return { html, document: parseHTML(html).document }; // parseHTML's window has no enumerable props: no spread
}

// The no-flash script: the first inline script inside #site.
export const noFlashScript = (doc) => doc.querySelector('#site > script').textContent;
