// Lighthouse CI: audits every public page on a mobile profile and fails the build if
// Accessibility or SEO drops below 100. Performance and Best Practices are reported as warnings,
// because they vary with the CI machine's speed.
const PAGES = [
  "/",
  "/about.html",
  "/events.html",
  "/bible-study.html",
  "/new-students.html",
  "/resources.html",
  "/fall-schedule.html",
  "/contact.html",
  "/install.html",
  "/offline.html",
];
const BASE_URL = process.env.BASE_URL || "http://127.0.0.1:4174";

module.exports = {
  ci: {
    collect: {
      url: PAGES.map((p) => BASE_URL + p),
      numberOfRuns: 1,
      settings: {
        chromeFlags: "--no-sandbox --headless=new",
      },
    },
    assert: {
      assertMatrix: [
        {
          // Every public page: Accessibility and SEO must be 100.
          matchingUrlPattern: "^(?!.*offline\\.html).*$",
          assertions: {
            "categories:accessibility": ["error", { minScore: 1 }],
            "categories:seo": ["error", { minScore: 1 }],
            "categories:best-practices": ["warn", { minScore: 0.9 }],
            "categories:performance": ["warn", { minScore: 0.9 }],
          },
        },
        {
          // The offline fallback is deliberately noindex, so SEO doesn't apply to it.
          matchingUrlPattern: "offline\\.html",
          assertions: {
            "categories:accessibility": ["error", { minScore: 1 }],
          },
        },
      ],
    },
    upload: {
      target: "filesystem",
      outputDir: ".lighthouseci/reports",
    },
  },
};
