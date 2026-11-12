import { test, expect, type Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { loginAsAdmin, resetData, seedAdmin, service, futureDate } from './helpers';

// Runs on a desktop and a phone-sized browser (see the projects in playwright.config.ts).
// Fails on serious or critical WCAG A/AA problems. The Cloudflare captcha iframe is third
// party content, so it is left out.
async function expectAccessible(page: Page) {
  await page.waitForTimeout(700);   // let the 0.3s fade-in finish, colours are read mid-animation otherwise
  const { violations } = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .exclude('iframe[src*="challenges.cloudflare.com"]')
    .analyze();
  const serious = violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  expect(serious.map((v) => `${v.id} [${v.impact}]: ${v.nodes.map((n) => n.target.join(' ')).join(' | ')}`)).toEqual([]);
}

test.beforeAll(seedAdmin);

test.beforeEach(async () => {
  await resetData();
  await service.from('bookings').insert([
    { date: futureDate(12), event_name: 'عرس', time_slot: 'lunch', person_name: 'علي', phone: '0501110000', status: 'confirmed' },
    { date: futureDate(20), event_name: 'خطبة', time_slot: 'wedding', person_name: 'سعد', phone: '0501110001', status: 'confirmed', book_diwan: true },
  ]);
  await service.from('booking_requests').insert({
    first_name: 'محمد', last_name: 'سلهب', phone: '0507776655', date: futureDate(30), time_slot: 'lunch', event_name: 'تجمع', status: 'pending',
  });
  await service.from('reviews').insert({ reviewer_name: 'ليلى', rating: 4, comment: 'جميل جداً', approved: true });
  await service.from('reviews').insert({ reviewer_name: 'نور', rating: 5, comment: 'ينتظر المراجعة', approved: false });
});

for (const id of ['calendar', 'events', 'request', 'reviews', 'stats']) {
  test(`public page "${id}" has no serious accessibility problems`, async ({ page }) => {
    await page.goto(`/#/${id}`);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expectAccessible(page);
  });
}

test('admin sign-in page has no serious accessibility problems', async ({ page }) => {
  await page.goto('/#/admin');
  await expect(page.getByLabel('رقم الهاتف')).toBeVisible();
  await expectAccessible(page);
});

test('every admin tab has no serious accessibility problems', async ({ page }) => {
  await loginAsAdmin(page);
  await expect(page.getByRole('heading', { name: 'لوحة الإدارة' })).toBeVisible();
  const main = page.locator('main');
  for (const tab of ['الطلبات', 'الحجوزات', 'إضافة حجز', 'التقييمات', 'تحميل الصورة']) {
    await main.getByRole('button', { name: new RegExp('^' + tab) }).click();   // the requests tab also carries a count badge
    await expectAccessible(page);
  }
});
