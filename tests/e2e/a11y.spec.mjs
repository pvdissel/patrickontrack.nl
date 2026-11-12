// Accessibility scan with axe on every page type (serious and critical problems only).
// Runs as its own Playwright project ("a11y"); it reports but doesn't block deploys yet.
import AxeBuilder from '@axe-core/playwright';
import { test, expect, URLS } from './fixtures.mjs';

for (const lang of ['nl', 'en']) {
  for (const [name, url] of Object.entries(URLS[lang])) {
    test(`${lang} ${name}: no serious accessibility problems`, async ({ page }) => {
      await page.goto(url);
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .exclude('.leaflet-control-attribution')   // third-party map credits
        .analyze();
      const serious = results.violations
        .filter((v) => ['serious', 'critical'].includes(v.impact))
        .map((v) => `${v.id}: ${v.help} (${v.nodes.length}×) e.g. ${v.nodes[0]?.target.join(' ')}`);
      expect(serious).toEqual([]);
    });
  }
}
