import { test, expect } from '@playwright/test';

// Read-only checks, safe to point at the live site: E2E_BASE_URL=https://... npm run e2e:smoke
test('home loads and public pages render without errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'التقويم' }).first()).toBeVisible();
  for (const label of ['المناسبات', 'طلب حجز', 'التقييمات', 'الإحصائيات']) {
    await page.getByRole('button', { name: label }).first().click();
    await expect(page.locator('main')).not.toBeEmpty();
  }
  expect(errors).toEqual([]);
});

test('public listings never contain phone numbers', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'المناسبات' }).first().click();
  await page.waitForTimeout(1500);
  const text = await page.locator('body').innerText();
  expect(text).not.toMatch(/(\+972|\b05\d)[\d\s-]{7,}/);
});

test('request form is gated by the captcha', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'طلب حجز' }).first().click();
  // The widget lives in a closed shadow root, so check its effect: no sending until it's solved.
  await expect(page.getByRole('button', { name: /إرسال/ })).toBeDisabled();
});
