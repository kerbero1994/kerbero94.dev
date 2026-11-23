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
      assertions: {
        'categories:performance': ['warn', { minScore: 0.9 }],
        'categories:accessibility': ['warn', { minScore: 1 }],
        'categories:best-practices': ['warn', { minScore: 0.95 }],
        'categories:seo': ['warn', { minScore: 0.95 }],
        'largest-contentful-paint': ['warn', { maxNumericValue: 2500 }],
        'cumulative-layout-shift': ['warn', { maxNumericValue: 0.1 }],
        'total-blocking-time': ['warn', { maxNumericValue: 200 }],
        'total-byte-weight': ['warn', { maxNumericValue: 1600000 }],
      },
    },
    upload: { target: 'filesystem', outputDir: '.lighthouseci/reports' },
  },
};
