// Filter chips on the Stories, Trails and Stays pages.
import { test, expect, visibleCount } from './fixtures.mjs';

const click = (page, group, value) =>
  page.locator(`[data-filter-group="${group}"] [data-filter="${value}"]`).click();

test('stories: filter by trail, hiding empty years and totals', async ({ page }) => {
  await page.goto('/en/stories/');
  const rows = '[data-filter-item="stories"]';
  expect(await visibleCount(page, rows)).toBe(4);           // the draft story is not published

  await click(page, 'stories', 'testpad');
  expect(await visibleCount(page, rows)).toBe(2);
  await expect(page.locator('[data-filter-block]').filter({ hasText: '2021' })).toBeHidden();
  await expect(page.locator('[data-filter-count]').first()).toBeHidden();
  await expect(page.locator('[data-filter="testpad"]')).toHaveAttribute('aria-pressed', 'true');

  await click(page, 'stories', 'all');
  expect(await visibleCount(page, rows)).toBe(4);
  await expect(page.locator('[data-filter-count]').first()).toBeVisible();
});

test('trails: filter by status and country', async ({ page }) => {
  await page.goto('/en/trails/');
  const cards = '[data-filter-item="trails"]';
  expect(await visibleCount(page, cards)).toBe(3);
  for (const [filter, expected] of [['completed', 1], ['in-progress', 1], ['abroad', 1], ['netherlands', 2], ['all', 3]]) {
    await click(page, 'trails', filter);
    expect(await visibleCount(page, cards), `filter ${filter}`).toBe(expected);
  }
});

test('stays: filter by type', async ({ page }) => {
  await page.goto('/nl/stays/');
  const cards = '[data-filter-item="stays"]';
  expect(await visibleCount(page, cards)).toBe(2);
  await click(page, 'stays', 'hut');
  expect(await visibleCount(page, cards)).toBe(1);
  await expect(page.locator(`${cards}:visible`)).toContainText('Testhut');
  await click(page, 'stays', 'all');
  expect(await visibleCount(page, cards)).toBe(2);
});
