# kerbero94.dev

Portfolio of Eduardo González, senior frontend engineer focused on accessibility.

One semantic HTML document per page, ten visual styles chosen from the **Style** menu. No framework and no build step: each page carries its own CSS and a few lines of JavaScript for the style picker, the copy-email button and the video chapters.

## Layout

| Path | What |
|---|---|
| `site/` | What Netlify publishes: five pages, images, the app video, the social preview, the résumé, `sitemap.xml`, `robots.txt` |
| `cv/cv.html` | Source of the résumé PDF (print it from Chrome) |
| `tests/unit/` | Browserless tests: page contract, shared-chrome drift, the style resolver, design rules |
| `tests/e2e/` | Playwright: what a visitor does, in Chrome, Firefox and WebKit on an iPhone |
| `tests/visual/` | Visual regression: 55 screens, baselines in `__screenshots__` |
| `checks/` | The axe scan, the Lighthouse summary, the production smoke test |
| `.github/workflows/` | `gate.yml` (the checks), `pr.yml`, `deploy.yml`, `monitor.yml` |

## The gate

Every pull request and every production deploy runs the same gate (`gate.yml`):

| Layer | What it proves | Tool |
|---|---|---|
| Static | Valid HTML; every page has its title, description, canonical, Open Graph, one `h1`, a skip link; every internal link and asset exists; the sitemap lists every page | html-validate, `node:test` |
| Unit | The no-flash style script: URL beats saved beats system, unknown values ignored, blocked storage survives | `node:test` + `vm` |
| Drift | The header, style picker, footer and scripts copied into each page stay identical | `node:test` + linkedom |
| Design rules | No coloured stripe on a side edge, ever | `node:test` on the CSS |
| Accessibility | axe-core 4.14, WCAG 2.0–2.2 A and AA, 5 pages × 10 styles plus the open picker; no failed requests, console errors, broken links or overflow at 390 px | `checks/scan.cjs` |
| E2E | Style picker (mouse, keyboard, persistence, shared links, system theme), copy email, résumé PDF, skip link, video chapters, table of contents, the site without JavaScript | Playwright: Chrome, Firefox, WebKit iPhone |
| Visual | First screen of 5 pages × 10 styles at 1280×800, and each page on a phone | Playwright screenshots |
| Performance | Lighthouse, mobile, median of 3 runs: category scores, LCP, CLS, TBT, page weight | Lighthouse CI |

Each test was checked against a deliberate break (a side stripe, a drifted picker, a missing sitemap entry, a broken link, a broken style resolver, a style that stops saving): it fails, then passes once the break is reverted.

## Run locally

```sh
npm install        # also points git at .githooks
npm test           # static + unit, seconds, no browser; also runs before every push
npm run serve      # http://127.0.0.1:8791 (supports Range, so the video can seek)
npm run test:a11y  # needs the server
npm run test:e2e
npm run test:perf
```

The browser suites run in CI so the shared Mac isn't loaded; run them locally only when needed. Visual baselines are Linux renders, so `npm run test:visual` only matches in CI.

## CI/CD

1. Branch, then open a pull request against `main`.
2. **PR** (`pr.yml`): the gate, then a Netlify preview linked on the pull request. Previews cost no Netlify credits. The Lighthouse table is in the run summary.
3. Merge when the gate is green and the preview looks right.
4. **Deploy** (`deploy.yml`): runs on `main` only when `site/` or `netlify.toml` changed. It runs the gate again on exactly what ships, deploys to production and runs `checks/smoke.sh` against kerbero94.dev.
5. **Monitor** (`monitor.yml`): the smoke test every day at 08:00 Mexico City (pages, PDF, redirects, certificate days left) and Lighthouse against production every Monday. A failure emails the owner.

**Visual baselines:** label a pull request `update-visuals`. CI renders the screens, commits them to the branch and removes the label. Review the images in the diff like any other change.

**Netlify credits:** each production deploy costs 15 of the 300 monthly credits on the free plan, and the site pauses when they run out. Batch changes into fewer merges; dependency updates (outside `site/`) merge without deploying.

**Rollback:** Netlify > Deploys > the previous production deploy > Publish deploy. It costs no credits.

**Secrets:** `NETLIFY_AUTH_TOKEN` (a Netlify personal access token) in the repo's Actions secrets. The site ID is not secret and lives in the workflows.
