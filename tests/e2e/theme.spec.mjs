// Light / dark theme: follows the system by default, a choice on the site wins and is remembered.
import { test, expect, URLS } from './fixtures.mjs';

const theme = (page) => page.evaluate(() => document.documentElement.dataset.theme);
const pageBg = (page) => page.evaluate(() => getComputedStyle(document.body).backgroundColor);
const LIGHT_BG = 'rgb(243, 244, 239)';   // --fog
const DARK_BG = 'rgb(17, 25, 21)';       // --fog, dark
const pressed = (page) => page.locator('[data-theme-choice][aria-pressed="true"]').getAttribute('data-theme-choice');

test.describe('theme', () => {
  test('follows the system: light', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto(URLS.nl.home);
    expect(await theme(page)).toBe('light');
    expect(await pageBg(page)).toBe(LIGHT_BG);
    expect(await pressed(page)).toBe('auto');
  });

  test('follows the system: dark, also when it changes while the page is open', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto(URLS.en.home);
    expect(await theme(page)).toBe('dark');
    expect(await pageBg(page)).toBe(DARK_BG);
    await page.emulateMedia({ colorScheme: 'light' });
    await expect.poll(() => theme(page)).toBe('light');
  });

  test('a choice overrides the system, is remembered on other pages, and "auto" goes back', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.goto(URLS.nl.home);
    await page.locator('[data-theme-choice="light"]').click();
    expect(await theme(page)).toBe('light');
    expect(await pressed(page)).toBe('light');

    await page.goto(URLS.nl.stories);
    expect(await theme(page)).toBe('light');
    expect(await pressed(page)).toBe('light');
    await page.emulateMedia({ colorScheme: 'light' });
    await page.emulateMedia({ colorScheme: 'dark' });
    expect(await theme(page)).toBe('light');   // a choice ignores system changes

    await page.locator('[data-theme-choice="auto"]').click();
    expect(await theme(page)).toBe('dark');
    await page.reload();
    expect(await theme(page)).toBe('dark');
    expect(await page.evaluate(() => localStorage.getItem('pot-theme'))).toBeNull();
  });

  test('the chosen theme is there before the page is painted (no flash)', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await page.addInitScript(() => {
      localStorage.setItem('pot-theme', 'dark');
      // record the theme as soon as <body> exists, before any rendering of it
      new MutationObserver((_, obs) => {
        if (document.body) { window.themeAtBody = document.documentElement.dataset.theme; obs.disconnect(); }
      }).observe(document, { childList: true, subtree: true });
    });
    await page.goto(URLS.en.trails);
    expect(await page.evaluate(() => window.themeAtBody)).toBe('dark');
  });

  test('the switch is in the menu on a phone and works there', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto(URLS.en.home);
    await page.locator('.nav-toggle').click();
    await page.locator('[data-theme-choice="dark"]').click();
    expect(await theme(page)).toBe('dark');
  });

  test('maps look the same in both themes (light tiles, routes and markers)', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' });
    await page.goto(URLS.en.trail);
    const look = () => page.evaluate(() => ({
      strokes: [...document.querySelectorAll('.leaflet-overlay-pane path')].map((p) => p.getAttribute('stroke')),
      tiles: getComputedStyle(document.querySelector('.leaflet-tile-pane')).filter,
      marker: getComputedStyle(document.querySelector('.mk--stage')).backgroundColor,
      zoom: getComputedStyle(document.querySelector('.leaflet-bar a')).backgroundColor,
    }));
    const light = await look();
    await page.locator('[data-theme-choice="dark"]').click();
    expect(await theme(page)).toBe('dark');
    expect(await look()).toEqual(light);
    await page.goto(URLS.en.trail);   // also when the page loads in the dark theme
    expect(await look()).toEqual(light);
  });

  test('printing uses the light theme', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark', media: 'print' });
    await page.goto(URLS.en.home);
    expect(await theme(page)).toBe('dark');
    expect(await page.evaluate(() => getComputedStyle(document.body).color)).toBe('rgb(24, 33, 28)');   // --ink, light
  });
});
