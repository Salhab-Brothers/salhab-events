import { test, expect } from '@playwright/test';

// People who raise their browser's text size (a common need) must still get a layout that fits.
// This needs a browser whose real default text size is changed, because layout breakpoints in
// rem react to that setting and a CSS override of the root size does not move them. Firefox lets a
// test set it with preferences, so this spec runs in the firefox project only.
test.skip(({ browserName }) => browserName !== 'firefox', 'needs Firefox preferences');
// Both font groups: Arabic text itself, and the general one that media queries in rem are measured against.
test.use({ launchOptions: { firefoxUserPrefs: { 'font.size.variable.ar': 32, 'font.size.variable.x-western': 32 } } });

const PAGES = ['calendar', 'events', 'request', 'reviews', 'stats', 'admin'];

for (const width of [390, 768, 1280]) {
  test(`at double text size nothing scrolls sideways (${width}px wide)`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    // Make sure the setting really took, otherwise this test proves nothing.
    expect(await page.evaluate(() => getComputedStyle(document.documentElement).fontSize)).toBe('32px');
    expect(await page.evaluate(() => matchMedia('(min-width: 64rem)').matches)).toBe(false);   // 64rem is now 2048px
    const problems: string[] = [];
    for (const id of PAGES) {
      await page.goto(`/#/${id}`);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await page.waitForTimeout(400);
      const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      if (over > 0) problems.push(`#/${id} is ${over}px too wide`);
    }
    expect(problems).toEqual([]);
  });
}

test('at double text size the wide screen uses the menu button, not a navigation that no longer fits', async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'القائمة' })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'التنقل الرئيسي' })).toBeHidden();
});
