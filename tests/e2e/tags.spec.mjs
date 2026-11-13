// Tags (data/tags.yaml): a story shows its own tags and those of its trip and trail;
// a tag page lists everything with the tag. On the test site the trip "Testtocht" is
// tagged Solo hiking (so its days are too), the Halfpad story Silent hiking, and a
// draft story Solo hiking (which must not show up).
import { test, expect, URLS } from './fixtures.mjs';

test('a story shows the tags it gets from its trip, linking to the tag page', async ({ page }) => {
  await page.goto(URLS.en.story);
  const chip = page.locator('.chip--tag', { hasText: 'Solo hiking' });
  await expect(chip).toHaveCount(1);
  await chip.click();
  await expect(page).toHaveURL(new RegExp(`${URLS.en.tag}$`));
});

test('the trip page shows its tags next to its trail', async ({ page }) => {
  await page.goto(URLS.nl.trip);
  await expect(page.locator('.metas .chip--trail')).toHaveCount(1);
  await expect(page.locator('.metas .chip--tag')).toHaveText(['Solo wandelen']);
});

test('a tag page lists the trip and every published day of it', async ({ page }) => {
  await page.goto(URLS.en.tag);
  await expect(page.locator('h1')).toHaveText('Solo hiking');
  await expect(page.locator('#tag-trips ~ .grid .card')).toHaveCount(1);
  await expect(page.locator('.story-row')).toHaveCount(2);   // day 1 and day 2, not the draft
  await expect(page.locator('.story-row', { hasText: 'Halve dag' })).toHaveCount(0);
});

test('the tags page lists each tag in use with its number of stories', async ({ page }) => {
  await page.goto(URLS.nl.tags);
  const items = page.locator('main li');
  await expect(items).toHaveText([/Solo wandelen\s*2/, /Stille hikes\s*1/]);
});
