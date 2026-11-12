// Every page type in both languages: loads, basic accessibility, maps, toggles,
// translations and number/date formatting.
import { test, expect, URLS } from './fixtures.mjs';

for (const lang of ['nl', 'en']) {
  for (const [name, url] of Object.entries(URLS[lang])) {
    test(`${lang} ${name} page (${url}) is sound`, async ({ page }) => {
      const response = await page.goto(url);
      expect(response.status()).toBe(200);
      await expect(page.locator('html')).toHaveAttribute('lang', lang);
      await expect(page.locator('h1')).toHaveCount(1);

      const problems = await page.evaluate(() => {
        const out = [];
        for (const img of document.querySelectorAll('img')) if (!img.hasAttribute('alt')) out.push(`img without alt: ${img.src}`);
        for (const el of document.querySelectorAll('a[href], button')) {
          const name = (el.getAttribute('aria-label') || el.textContent || el.getAttribute('title') || '').trim()
            || [...el.querySelectorAll('img[alt]')].map((i) => i.alt).join('').trim();
          if (!name) out.push(`${el.tagName.toLowerCase()} without a name: ${el.outerHTML.slice(0, 80)}`);
        }
        const ids = [...document.querySelectorAll('[id]')].map((e) => e.id);
        for (const id of new Set(ids.filter((id, i) => ids.indexOf(id) !== i))) out.push(`duplicate id: ${id}`);
        return out;
      });
      expect(problems).toEqual([]);
    });
  }
}

test.describe('maps', () => {
  for (const name of ['story', 'trip', 'trail', 'stage', 'home']) {
    test(`${name} page draws routes on the map`, async ({ page }) => {
      await page.goto(URLS.en[name]);
      const map = page.locator('.leaflet-container').first();
      await expect(map).toBeVisible();
      expect(await map.locator('.leaflet-overlay-pane path').count()).toBeGreaterThan(0);
    });
  }

  test('trail page: "Show my tracks" toggles my recorded tracks', async ({ page }) => {
    await page.goto(URLS.en.trail);
    const mine = page.locator('.leaflet-overlay-pane path[stroke="#C8641E"]');
    const toggle = page.locator('[data-map-toggle]');
    await expect(toggle).toHaveAttribute('aria-pressed', 'false');
    await expect(mine).toHaveCount(0);
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-pressed', 'true');
    expect(await mine.count()).toBeGreaterThan(0);
    await toggle.click();
    await expect(mine).toHaveCount(0);
  });

  test('stage page shows the stay near its end', async ({ page }) => {
    await page.goto(URLS.en.stage);
    await expect(page.locator('.mk--stay')).toHaveCount(1);
  });

  // The test hut is where stage 1 ends and stage 2 starts: those markers must not cover each other.
  for (const name of ['trail', 'stage']) {
    test(`${name} page: markers on the same spot sit side by side at every zoom level`, async ({ page }) => {
      await page.goto(URLS.en[name]);
      const overlaps = () => page.$$eval('.leaflet-marker-icon', (els) => {
        const boxes = els.map((e) => ({ t: e.title, r: e.getBoundingClientRect() }));
        const out = [];
        boxes.forEach((a, i) => boxes.slice(i + 1).forEach((b) => {
          if (a.r.left < b.r.right && b.r.left < a.r.right && a.r.top < b.r.bottom && b.r.top < a.r.bottom) out.push(`${a.t} / ${b.t}`);
        }));
        return out;
      });
      for (const button of ['', '.leaflet-control-zoom-out', '.leaflet-control-zoom-out', '.leaflet-control-zoom-in']) {
        if (button) {
          await page.locator(button).click();
          await page.waitForTimeout(400);   // zoom animation
        }
        expect(await overlaps()).toEqual([]);
      }
      const sizes = await page.$$eval('.leaflet-marker-icon', (els) => els.map((e) => Math.min(e.offsetWidth, e.offsetHeight)));
      expect(Math.min(...sizes)).toBeGreaterThanOrEqual(24);
    });
  }
});

test.describe('wide content on small screens', () => {
  test('the elevation chart scrolls sideways on a phone and can then be focused, not on a desktop', async ({ page }) => {
    await page.goto(URLS.en.stage);
    const chart = page.locator('figure.elevation').first();
    await expect(chart).not.toHaveAttribute('tabindex');
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(chart).toHaveAttribute('tabindex', '0');
  });

  test('gear tables that scroll have a name, from their category heading', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(URLS.en.gearList);
    const box = page.locator('.table-box[role="region"]').first();
    const heading = await page.locator(`#${await box.getAttribute('aria-labelledby')}`).textContent();
    expect(heading.trim()).not.toBe('');
  });
});

test.describe('translations', () => {
  test('a translated story uses the English text, without a note', async ({ page }) => {
    await page.goto(URLS.en.story);
    await expect(page.locator('h1')).toHaveText('Day 1');
    await expect(page.locator('.prose').first()).toContainText('English text of day 1');
    await expect(page.locator('.lang-notice')).toHaveCount(0);
    await expect(page.locator('.timeline')).toContainText('Off we go');
    await expect(page.locator('.timeline')).toContainText('08:00');                // time comes from Dutch
  });

  test('an untranslated story shows the Dutch text with a note, and points search engines to Dutch', async ({ page }) => {
    await page.goto(URLS.en.untranslated);
    await expect(page.locator('h1')).toHaveText('Dag 2');
    await expect(page.locator('.lang-notice')).toContainText('only available in Dutch');
    await expect(page.locator('.prose[lang="nl"]')).toContainText('Nederlandse tekst van dag 2');
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /\/nl\/stories\/2022\/dag-2\/$/);
  });

  test('untranslated pages get a language badge in lists', async ({ page }) => {
    await page.goto(URLS.en.stories);
    await expect(page.locator('.story-row', { hasText: 'Dag 2' }).locator('.lang-badge')).toHaveText('NL');
    await expect(page.locator('.story-row', { hasText: 'Day 1' }).locator('.lang-badge')).toHaveCount(0);
  });

  test('data comes from the Dutch page, text from the English one', async ({ page }) => {
    await page.goto(URLS.en.stay);
    await expect(page.locator('h1')).toHaveText('Test hut');
    await expect(page.getByText('€ 12.50')).toBeVisible();                       // English text field
    await expect(page.locator('.facilities')).toContainText('Shower');
    await page.goto(URLS.en.gearList);
    const row = page.locator('tr', { hasText: 'Backpack' });                     // English name …
    await expect(row).toContainText('1,450 g');                                   // … Dutch weight, English format
  });

  test('numbers and dates follow the page language', async ({ page }) => {
    await page.goto(URLS.nl.gearList);
    await expect(page.locator('tr', { hasText: 'Rugzak' })).toContainText('1.450 g');
    await page.goto(URLS.nl.story);
    await expect(page.locator('time').first()).toHaveText('zaterdag 8 januari 2022');
    await page.goto(URLS.en.story);
    await expect(page.locator('time').first()).toHaveText('Saturday 8 January 2022');
  });

  test('drafts are not published', async ({ page }) => {
    const response = await page.goto('/en/stories/2022/concept/');
    expect(response.status()).toBe(404);
    await page.goto(URLS.nl.stories);
    await expect(page.getByText('Concept')).toHaveCount(0);
  });
});

test.describe('trips', () => {
  test('a trip adds up its days and lists them', async ({ page }) => {
    await page.goto(URLS.en.trip);
    await expect(page.locator('h1')).toHaveText('Test trip');
    const stat = (label) => page.locator('.stat', { hasText: label }).locator('.stat__value');
    await expect(stat('Days')).toHaveText('2');
    await expect(stat('Nights')).toHaveText('2');
    await expect(page.locator('.story-row')).toHaveCount(2);
    await expect(page.getByRole('heading', { name: 'The run-up' })).toBeVisible();
    await expect(page.locator('.card', { hasText: 'Voorbereiding' })).toBeVisible();
  });

  test('a story links back to its trip', async ({ page }) => {
    await page.goto(URLS.en.story);
    await page.getByRole('link', { name: /Trip overview/ }).click();
    await expect(page).toHaveURL(new RegExp(`${URLS.en.trip}$`));
  });
});

test.describe('small screens', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('the menu opens and closes', async ({ page }) => {
    await page.goto(URLS.en.home);
    const toggle = page.locator('.nav-toggle');
    const nav = page.locator('#site-nav');
    await expect(nav).toBeHidden();
    await toggle.click();
    await expect(nav).toBeVisible();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await toggle.click();
    await expect(nav).toBeHidden();
  });

  test('no page is wider than the screen', async ({ page }) => {
    for (const url of Object.values(URLS.en)) {
      await page.goto(url);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow, `horizontal scroll on ${url}`).toBeLessThanOrEqual(0);
    }
  });
});
