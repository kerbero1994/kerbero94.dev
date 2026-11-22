# kerbero94.dev

Portfolio of Eduardo González, senior frontend engineer focused on accessibility.

One semantic HTML document per page, ten visual styles chosen from the **Style** menu. No framework and no build step: each page carries its own CSS and a few lines of JavaScript for the style picker, the copy-email button and the video chapters.

## Layout

| Path | What |
|---|---|
| `site/` | What Netlify publishes: four pages, images, the app video, the social preview |
| `cv/cv.html` | Source of the résumé PDF (print it from Chrome) |

## Run locally

```sh
python3 -m http.server 8000 --directory site
```

## Deploy

```sh
netlify deploy --prod
```

`netlify.toml` points the publish directory at `site/`.

## Checks

`npm install`, then `npm run serve` in one terminal and `npm run check` in another (uses the installed Chrome). Before each deploy: axe-core 4.14 on every page in all ten styles (WCAG 2.0–2.2, A and AA), plus the open style picker; no failed requests, no console errors, and no horizontal scroll at 390 px.
