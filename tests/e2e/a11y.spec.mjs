// Accessibility scan with axe on every page type, on a desktop and a phone screen.
// Checks WCAG 2.0, 2.1 and 2.2 (levels A and AA) plus axe's best practices, and fails on any
// problem, whatever its impact. Runs as its own Playwright project ("a11y").
import AxeBuilder from '@axe-core/playwright';
import { test, expect, URLS } from './fixtures.mjs';

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22a', 'wcag22aa', 'best-practice'];
const SCREENS = { desktop: null, phone: { width: 390, height: 844 } };

for (const [screen, viewport] of Object.entries(SCREENS)) {
  test.describe(screen, () => {
    if (viewport) test.use({ viewport });
    for (const lang of ['nl', 'en']) {
      for (const [name, url] of Object.entries(URLS[lang])) {
        test(`${lang} ${name}: no accessibility problems`, async ({ page }) => {
          await page.goto(url);
          const results = await new AxeBuilder({ page })
            .withTags(TAGS)
            .exclude('.leaflet-control-attribution')   // third-party map credits
            .analyze();
          const problems = results.violations.map((v) =>
            `[${v.impact}] ${v.id}: ${v.help} (${v.nodes.length}×): ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`);
          expect(problems).toEqual([]);
        });
      }
    }
  });
}
