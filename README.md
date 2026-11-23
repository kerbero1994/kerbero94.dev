# kerbero94.dev

Portfolio of Eduardo González, senior frontend engineer focused on accessibility.

One semantic HTML document per page, ten visual styles chosen from the **Style** menu. No framework and no build step: each page carries its own CSS and a few lines of JavaScript for the style picker, the copy-email button and the video chapters.

## Layout

| Path | What |
|---|---|
| `site/` | What Netlify publishes: five pages, images (AVIF, WebP, JPG fallback), self-hosted fonts, the app video, the social preview, the résumé, `sitemap.xml`, `robots.txt`, `.well-known/security.txt` |
| `cv/cv.html` | Source of the résumé PDF (print it from Chrome) |
| `tests/unit/` | Browserless tests: page contract, shared-chrome drift, the style resolver, design rules, CSP, structured data |
| `tests/e2e/` | Playwright: what a visitor does, in Chrome, Firefox and WebKit on an iPhone; ARIA snapshots in `__snapshots__` |
| `tests/visual/` | Visual regression: 57 screens, baselines in `__snapshots__` |
| `checks/` | The axe scan, spell check, Lighthouse summary, production smoke test, Observatory grade, DNS check |
| `scripts/` | `csp.mjs` (regenerates the CSP hashes), `images.sh` (responsive image variants) |
| `.github/workflows/` | `gate.yml` (the checks), `pr.yml`, `deploy.yml`, `monitor.yml` |

## The gate

Every pull request and every production deploy runs the same gate (`gate.yml`):

| Layer | What it proves | Tool |
|---|---|---|
| Secrets | No credential anywhere in the git history | gitleaks |
| Static | Valid HTML; every page has its title, description, canonical, Open Graph, structured data, one `h1`, a skip link; every link, asset, `srcset` entry and preload exists; every image is responsive (AVIF, WebP, fallback); the sitemap lists every page | html-validate, `node:test` |
| Unit | The no-flash style script: URL beats saved beats system, unknown values ignored, blocked storage survives | `node:test` + `vm` |
| Drift | The header, style picker, footer and scripts copied into each page stay identical | `node:test` + linkedom |
| Security | The CSP allows exactly the inline scripts and styles on the pages, with no `unsafe-inline`; every security header is set; `security.txt` is valid and not about to expire | `node:test` |
| Design rules | No coloured stripe on a side edge, ever | `node:test` on the CSS |
| Content | No spelling mistakes in anything a visitor reads or hears (text, alt, labels) | cspell |
| Accessibility | axe-core 4.14, WCAG 2.0–2.2 A and AA, plus AAA contrast (7:1), on 5 pages × 10 styles and the open picker; no failed requests, console errors, broken links, or overflow at 390 or 320 px | `checks/scan.cjs` |
| E2E | Style picker (mouse, keyboard, persistence, shared links, system theme), copy email, résumé PDF, skip link, focus ring in every style, reduced motion, video chapters, table of contents, the site without JavaScript, the accessibility tree; any console error or CSP violation fails | Playwright: Chrome, Firefox, WebKit iPhone |
| Visual | First screen of 5 pages × 10 styles at 1280×800, each page on a phone, and forced colors (Windows high contrast) | Playwright screenshots |
| Performance | Lighthouse, mobile and desktop, median of 3 runs: every category 100 (performance 95), LCP ≤ 2.5 s, CLS ≤ 0.1, TBT ≤ 200 ms, ≤ 800 KB per page | Lighthouse CI |

Each check was proved against a deliberate break: it fails, then passes once the break is reverted.

## Run locally

```sh
npm install        # also points git at .githooks
npm test           # static, unit, CSP, spelling: seconds, no browser; also runs before every push
npm run serve      # http://127.0.0.1:8791 (supports Range, so the video can seek)
npm run test:a11y  # needs the server
npm run test:e2e
npm run test:perf
npm run csp        # after changing any inline CSS or JS
scripts/images.sh  # after adding or changing an image (needs ffmpeg, cwebp, sips)
```

The browser suites run in CI so the shared Mac isn't loaded; run them locally only when needed. Visual baselines are Linux renders, so `npm run test:visual` only matches in CI.

## CI/CD

1. Branch, then open a pull request against `main`.
2. **PR** (`pr.yml`): the gate, then a Netlify preview linked on the pull request. Previews cost no Netlify credits. The Lighthouse tables are in the run summary.
3. Merge when the gate is green and the preview looks right.
4. **Deploy** (`deploy.yml`): runs on `main` only when `site/` or `netlify.toml` changed. It runs the gate again on exactly what ships, deploys to production, smoke-tests kerbero94.dev and requires an A+ from Mozilla's HTTP Observatory.
5. **Monitor** (`monitor.yml`): every day at 08:00 Mexico City, the smoke test (pages, PDF, fonts, `security.txt`, redirects, certificate days left), the Observatory grade, DNS hardening (CAA, DNSSEC, DMARC, SPF) and the static suite. Every Monday, Lighthouse against production, mobile and desktop. A failure emails the owner.

**Visual baselines:** label a pull request `update-visuals`. CI renders the screens, commits them to the branch and removes the label. Review the images in the diff like any other change.

**Netlify credits:** each production deploy costs 15 of the 300 monthly credits on the free plan, and the site pauses when they run out. Batch changes into fewer merges; dependency updates (outside `site/`) merge without deploying.

**Rollback:** Netlify > Deploys > the previous production deploy > Publish deploy. It costs no credits.

**Secrets:** `NETLIFY_AUTH_TOKEN` (a Netlify personal access token) in the repo's Actions secrets. The site ID is not secret and lives in the workflows.

**Caching:** fonts are cached for a year (`immutable`), images and video for 30 days. Give a changed image or font a new file name.
