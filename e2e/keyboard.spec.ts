import { test, expect } from '@playwright/test';
import { resetData, service, futureDate } from './helpers';

// What a person who never touches a mouse needs: a way past the navigation, and dialogs that
// behave like dialogs.
test.beforeEach(resetData);

test('the first Tab stop is a skip link that jumps to the content', async ({ page }) => {
  await page.goto('/#/events');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await page.keyboard.press('Tab');
  const skip = page.getByRole('link', { name: 'انتقل إلى المحتوى' });
  await expect(skip).toBeFocused();
  await expect(skip).toBeVisible();   // it appears when focused
  await page.keyboard.press('Enter');
  await expect(page.locator('main')).toBeFocused();
  expect(page.url()).toContain('#/events');   // the page address (the router) was left alone
  await page.keyboard.press('Tab');           // the next stop is inside the content, not the navigation again
  expect(await page.evaluate(() => document.activeElement?.closest('main') !== null)).toBe(true);
});

test('the day details dialog closes with Escape and focus goes back to the day', async ({ page }) => {
  const date = futureDate(10);
  await service.from('bookings').insert({
    date, event_name: 'عرس الاختبار', time_slot: 'lunch', person_name: 'أبو الاختبار', phone: '0509998877', status: 'confirmed',
  });
  await page.goto('/#/calendar');
  const day = page.locator(`button[data-date="${date}"]`);
  await day.focus();
  await page.keyboard.press('Enter');
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText('عرس الاختبار')).toBeVisible();
  // Tab can only reach the dialog (or the browser's own toolbar, where the page reports no focused
  // element); the page behind is inert.
  for (let i = 0; i < 6; i++) {
    await page.keyboard.press('Tab');
    expect(await page.evaluate(() => document.activeElement === document.body || document.activeElement?.closest('dialog') != null)).toBe(true);
  }
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(day).toBeFocused();
});
