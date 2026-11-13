// Shared test setup: every page is checked for JavaScript errors, and requests to
// other sites (map tiles, YouTube thumbnails) are blocked so tests are fast and offline.
import { test as base, expect } from '@playwright/test';

export const test = base.extend({
  page: async ({ page }, use) => {
    const errors = [];
    await page.route(/^https?:\/\/(?!localhost[:/])/, (route) => route.abort());
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => {
      if (m.type() === 'error' && !/Failed to load resource|net::ERR_/.test(m.text())) errors.push(m.text());
    });
    await use(page);
    expect(errors, 'JavaScript errors on the page').toEqual([]);
  },
});
export { expect };

// URLs of the test site (tests/fixtures), per language
export const URLS = {
  nl: {
    home: '/nl/', stories: '/nl/stories/', story: '/nl/stories/2022/dag-1/', untranslated: '/nl/stories/2022/dag-2/',
    trips: '/nl/trips/', trip: '/nl/trips/testtocht/', trails: '/nl/trails/', trail: '/nl/trails/testpad/',
    stage: '/nl/trails/stages/testpad-1/', stays: '/nl/stays/', stay: '/nl/stays/hut/', gear: '/nl/gear/',
    gearList: '/nl/gear/2022-01-test/', about: '/nl/about/', tags: '/nl/tags/', tag: '/nl/tags/solo-hiking/',
  },
  en: {
    home: '/en/', stories: '/en/stories/', story: '/en/stories/2022/day-1/', untranslated: '/en/stories/2022/dag-2/',
    trips: '/en/trips/', trip: '/en/trips/testtocht/', trails: '/en/trails/', trail: '/en/trails/testpad/',
    stage: '/en/trails/stages/testpad-1/', stays: '/en/stays/', stay: '/en/stays/hut/', gear: '/en/gear/',
    gearList: '/en/gear/2022-01-test/', about: '/en/about/', tags: '/en/tags/', tag: '/en/tags/solo-hiking/',
  },
};

/** Elements matching `selector` that are actually visible. */
export async function visibleCount(page, selector) {
  return page.locator(selector).evaluateAll((els) => els.filter((e) => e.offsetParent !== null).length);
}
