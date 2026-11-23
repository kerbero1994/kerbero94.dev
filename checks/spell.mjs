// Spell-checks what a visitor reads or hears: visible text, alt, aria-label, title and the
// meta description. Code and CSS comments are skipped. Unknown words fail the gate; real
// names and terms go in cspell.json.
import { spawnSync } from 'node:child_process';
import { PAGES, load } from '../tests/unit/site.mjs';

const text = PAGES.map((p) => {
  const { document } = load(p);
  document.querySelectorAll('script, style, noscript').forEach((e) => e.remove());
  const attrs = [...document.querySelectorAll('[alt], [aria-label], [title]')].map((e) => [e.getAttribute('alt'), e.getAttribute('aria-label'), e.getAttribute('title')].filter(Boolean).join(' '));
  return [document.title, document.querySelector('meta[name=description]')?.getAttribute('content'), document.body.textContent, ...attrs].join('\n');
}).join('\n');

const r = spawnSync('npx', ['cspell', 'stdin', '--no-progress', '--unique', '--show-suggestions', '--language-id', 'plaintext'], { input: text, encoding: 'utf8' });
process.stdout.write(r.stdout);
process.exit(r.status);
