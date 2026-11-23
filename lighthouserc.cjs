// Lighthouse CI: every page, three runs each, mobile emulation (Lighthouse's default:
// a mid-range phone on slow 4G). Budgets are floors set from the first measured
// baseline; raise them when a change beats them, never lower them to make a PR pass.
const PAGES = ['/', '/sitimm/', '/accessibility/', '/sitimmvito/', '/architecture/'];
const ORIGIN = process.env.LHCI_ORIGIN; // set for production runs; unset = serve site/ locally

module.exports = {
  ci: {
    collect: {
      ...(ORIGIN ? { url: PAGES.map((p) => ORIGIN + p) } : { staticDistDir: './site', url: PAGES.map((p) => `http://localhost${p}`) }),
      numberOfRuns: 3,
    },
    assert: {
      // Floors from the 23 Nov 2026 baseline (CI, mobile): every category 100, performance
      // 99-100 after the CLS fix; LCP 1.6 s; TBT 0 ms; heaviest page 724 KiB. CLS was 0.22 until the
      // header stopped re-wrapping when the web font arrived.
      assertions: {
        'categories:performance': ['error', { minScore: 0.95 }], // ratcheted: 99-100 once CLS was fixed
        'categories:accessibility': ['error', { minScore: 1 }],
        'categories:best-practices': ['error', { minScore: 1 }],
        'categories:seo': ['error', { minScore: 1 }],
        'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
        'total-blocking-time': ['error', { maxNumericValue: 200 }],
        'total-byte-weight': ['error', { maxNumericValue: 800000 }],
      },
    },
    upload: { target: 'filesystem', outputDir: '.lighthouseci/reports' },
  },
};
