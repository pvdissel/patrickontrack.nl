// Which language a visitor gets, saved choices, old links and the 404 page.
import { test, expect } from './fixtures.mjs';

test.describe('the root page picks a language', () => {
  for (const [locale, expected] of [['nl-NL', '/nl/'], ['en-US', '/en/'], ['de-DE', '/en/']]) {
    test(`browser in ${locale} → ${expected}`, async ({ browser }) => {
      const context = await browser.newContext({ locale });
      const page = await context.newPage();
      await page.goto('/');
      await expect(page).toHaveURL(new RegExp(`${expected}$`));
      await context.close();
    });
  }
});

test.describe('a language chosen on the site wins', () => {
  test.use({ locale: 'nl-NL' });

  test('clicking EN is remembered at /', async ({ page }) => {
    await page.goto('/nl/');
    await page.locator('a.lang-switch').click();
    await expect(page).toHaveURL(/\/en\/$/);
    expect(await page.evaluate(() => localStorage.getItem('pot-lang'))).toBe('en');
    await page.goto('/');
    await expect(page).toHaveURL(/\/en\/$/);
  });

  test('the switch keeps you on the same page', async ({ page }) => {
    await page.goto('/nl/trails/testpad/');
    await page.locator('a.lang-switch').click();
    await expect(page).toHaveURL(/\/en\/trails\/testpad\/$/);
  });
});

test.describe('suggestion banner', () => {
  test('a Dutch browser on an English page gets the banner, and "Blijf hier" hides it for good', async ({ browser }) => {
    const context = await browser.newContext({ locale: 'nl-NL' });
    const page = await context.newPage();
    await page.goto('/en/trails/');
    const banner = page.locator('[data-suggest="nl"]');
    await expect(banner).toBeVisible();
    await expect(banner).toContainText('Deze pagina is ook in het Nederlands beschikbaar');
    await banner.locator('[data-dismiss]').click();
    await expect(banner).toBeHidden();
    await page.reload();
    await expect(page.locator('[data-suggest="nl"]')).toBeHidden();
    await context.close();
  });

  test('no banner when the page is already in the browser language', async ({ page }) => {
    await page.goto('/en/trails/');
    await expect(page.locator('.lang-suggest:not([hidden])')).toHaveCount(0);
  });
});

test.describe('old links and 404', () => {
  test('an old link goes to the page in the visitor language (Dutch)', async ({ browser }) => {
    const context = await browser.newContext({ locale: 'nl-NL' });
    const page = await context.newPage();
    await page.goto('/adventures/test/dag-1/');
    await expect(page).toHaveURL(/\/nl\/stories\/2022\/dag-1\/$/);
    await context.close();
  });

  test('an old link goes to the page in the visitor language (English)', async ({ page }) => {
    await page.goto('/adventures/test/dag-1/');
    await expect(page).toHaveURL(/\/en\/stories\/2022\/day-1\/$/);
  });

  test('a missing page shows "not found" in the language of the URL', async ({ page }) => {
    let response = await page.goto('/nl/bestaat-niet/');
    expect(response.status()).toBe(404);
    await expect(page.locator('h1:visible')).toHaveText('Dit pad loopt dood.');
    response = await page.goto('/en/does-not-exist/');
    expect(response.status()).toBe(404);
    await expect(page.locator('h1:visible')).toHaveText('This path doesn’t go anywhere.');
  });
});
