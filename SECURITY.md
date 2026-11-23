# Security

## Reporting a vulnerability

Email **eduardo@kerbero94.dev** with what you found and how to reproduce it. Please don't open a public issue for it. I reply within three working days and keep you posted until it's fixed. The same contact is in [`/.well-known/security.txt`](https://kerbero94.dev/.well-known/security.txt).

## Scope

kerbero94.dev and this repository: the static site, its HTTP headers and Content Security Policy, and the CI/CD workflows. The site has no accounts, forms or backend.

## What's in place

- A Content Security Policy with no `unsafe-inline`: every inline script and style is allowed by its SHA-256 hash, and a unit test fails when a hash goes stale.
- HSTS with preload, `X-Frame-Options: DENY`, COOP, CORP, Permissions-Policy. The deploy requires an A+ from Mozilla's HTTP Observatory, and the daily monitor checks it again.
- gitleaks scans the whole git history on every pull request and deploy.
- Self-hosted fonts, no cookies, no third-party scripts.
- The only secret is the Netlify deploy token: an encrypted Actions secret, never available to pull requests from forks or Dependabot. The daily monitor checks it's still valid.
