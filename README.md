# kerbero94.dev

Portfolio of Eduardo González, senior frontend engineer focused on accessibility.

One semantic HTML document per page, ten visual styles chosen from the **Style** menu. No framework and no build step: each page carries its own CSS and a few lines of JavaScript for the style picker, the copy-email button and the video chapters.

## Layout

| Path | What |
|---|---|
| `site/` | What Netlify publishes: five pages, images, the app video, the social preview, the résumé |
| `cv/cv.html` | Source of the résumé PDF (print it from Chrome) |
| `checks/scan.cjs` | The check CI runs, and you can run locally |
| `.github/workflows/` | `ci.yml` for pull requests, `deploy.yml` for production |

## Run locally

```sh
npm install
npm run serve   # http://127.0.0.1:8791
npm run check   # in another terminal; uses the installed Chrome
```

The check runs axe-core 4.14 on every page in all ten styles (WCAG 2.0–2.2, A and AA), plus the open style picker. It also fails on failed requests, console errors, broken internal links and horizontal scroll at 390 px. It exits 1 on any finding.

## CI/CD

1. Work on a branch and open a pull request against `main`.
2. **CI** (`ci.yml`) runs the check, then deploys a Netlify preview and links it on the pull request. Previews cost no Netlify credits.
3. Merge when the check is green and the preview looks right.
4. **Deploy** (`deploy.yml`) runs on `main` only when `site/` or `netlify.toml` changed. It runs the check again on exactly what ships, deploys to production, and smoke-tests kerbero94.dev.

Each production deploy costs 15 of the 300 monthly credits on Netlify's free plan, and the site pauses when they run out. So batch changes into fewer merges, and let dependency updates (which don't touch `site/`) merge without deploying.

**Rollback:** Netlify > Deploys > the previous production deploy > Publish deploy. It costs no credits.

**Secrets:** `NETLIFY_AUTH_TOKEN` (a Netlify personal access token) in the repo's Actions secrets. The site ID is not secret and lives in the workflows.
