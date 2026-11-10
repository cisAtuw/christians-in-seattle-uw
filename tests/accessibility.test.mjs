// Accessibility gate: axe-core must find zero violations on every public page,
// in English and Chinese, at phone and desktop widths (10 pages x 2 languages x 2 viewports).
//
//   npm run serve &        # serves the site on 127.0.0.1:4174
//   npm run test:a11y
import { after, before, describe, test } from "node:test";
import assert from "node:assert/strict";
import { chromium } from "playwright";
import AxeBuilder from "@axe-core/playwright";
import { BASE_URL, PAGES } from "./pages.mjs";

const LANGUAGES = ["en", "zh"];
const VIEWPORTS = {
  mobile: { width: 390, height: 844 },
  desktop: { width: 1280, height: 900 },
};

let browser;
before(async () => {
  browser = await chromium.launch();
});
after(async () => {
  await browser?.close();
});

function describeViolations(violations) {
  return violations
    .map((v) => `${v.id} (${v.impact}): ${v.help}\n    ${v.nodes.map((n) => n.target.join(" ")).join("\n    ")}`)
    .join("\n");
}

for (const language of LANGUAGES) {
  for (const [viewportName, viewport] of Object.entries(VIEWPORTS)) {
    describe(`${language} / ${viewportName}`, () => {
      for (const path of PAGES) {
        test(path, async () => {
          const context = await browser.newContext({ viewport, serviceWorkers: "block" });
          // The language switch is stored in localStorage; set it before any page script runs.
          await context.addInitScript((lang) => localStorage.setItem("cis-uw-language", lang), language);
          // Keep the check about our pages: don't depend on third-party scripts or the reminder API.
          await context.route(/^https?:\/\/(?!127\.0\.0\.1|localhost)/, (route) => route.abort());
          const page = await context.newPage();
          const response = await page.goto(BASE_URL + path, { waitUntil: "load" });
          assert.equal(response.status(), 200, `${path} did not load`);
          await page.waitForTimeout(300); // let the language and schedule scripts render

          const expectedLang = language === "zh" ? "zh-CN" : "en";
          assert.equal(await page.getAttribute("html", "lang"), expectedLang, `${path} did not switch to ${language}`);

          const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "best-practice"]).analyze();
          await context.close();
          assert.equal(results.violations.length, 0, describeViolations(results.violations));
        });
      }
    });
  }
}
