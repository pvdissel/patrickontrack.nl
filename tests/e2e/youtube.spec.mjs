// YouTube: nothing loads from YouTube until a click; videos and playlists both embed
// through youtube-nocookie. (The test site links one video and one playlist.)
import { test, expect, URLS } from './fixtures.mjs';

test('a story video loads the player only after a click', async ({ page }) => {
  await page.goto(URLS.en.story);
  const box = page.locator('.video').first();
  await expect(box.locator('iframe')).toHaveCount(0);
  await expect(box.locator('img')).toHaveAttribute('src', 'https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg');
  await box.getByRole('button', { name: 'Play video: Day 1' }).click();
  await expect(box.locator('iframe')).toHaveAttribute('src', 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?autoplay=1&rel=0');
});

test('a trip playlist embeds the whole playlist', async ({ page }) => {
  await page.goto(URLS.nl.trip);
  // a trip with its own video or playlist shows only that, not each day's video
  const box = page.locator('.video');
  await expect(box).toHaveCount(1);
  await expect(box.locator('.video__tag')).toHaveText('Afspeellijst');
  await expect(box.locator('img')).toHaveCount(0);
  await box.getByRole('button', { name: 'Afspeellijst afspelen: Testtocht' }).click();
  await expect(box.locator('iframe')).toHaveAttribute('src', 'https://www.youtube-nocookie.com/embed/videoseries?list=PLtest0123456789abcdef&autoplay=1&rel=0');
});
