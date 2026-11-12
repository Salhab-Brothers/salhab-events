import { test, expect } from '@playwright/test';
import { ADMIN_PHONE, loginAsAdmin, resetData, seedAdmin, service, futureDate } from './helpers';

test.beforeAll(seedAdmin);
test.beforeEach(resetData);

test('wrong password is refused, right password opens the admin panel', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'الإدارة' }).first().click();
  await page.getByPlaceholder('05xxxxxxxx').fill(ADMIN_PHONE);
  await page.getByPlaceholder('••••••••').fill('wrong-password');
  await page.getByRole('button', { name: 'دخول' }).click();
  await expect(page.getByText('رقم الهاتف أو كلمة المرور غير صحيحة')).toBeVisible();

  await loginAsAdmin(page);
  await expect(page.getByRole('heading', { name: 'لوحة الإدارة' })).toBeVisible();
});

test('approving a request creates a confirmed booking', async ({ page }) => {
  await service.from('booking_requests').insert({
    first_name: 'محمد', last_name: 'سلهب', phone: '0507776655', date: futureDate(30),
    time_slot: 'lunch', event_name: 'خطبة', status: 'pending',
  });
  await loginAsAdmin(page);
  await page.getByRole('button', { name: 'قبول' }).click();

  await expect(page.getByText('مقبول')).toBeVisible();
  const bookings = await service.from('bookings').select('*');
  expect(bookings.data).toHaveLength(1);
  expect(bookings.data![0]).toMatchObject({ event_name: 'خطبة', status: 'confirmed', phone: '0507776655' });
  const requests = await service.from('booking_requests').select('status');
  expect(requests.data![0].status).toBe('approved');
});

test('admin sees phones and can approve a review so it goes public', async ({ page, context }) => {
  await service.from('bookings').insert({
    date: futureDate(20), event_name: 'عرس', time_slot: 'wedding', person_name: 'علي', phone: '0501110000', status: 'confirmed',
  });
  await service.from('reviews').insert({ reviewer_name: 'ليلى', rating: 4, comment: 'جميل جداً', approved: false });

  await loginAsAdmin(page);
  await page.getByRole('button', { name: 'الحجوزات' }).click();
  await expect(page.getByText('0501110000')).toBeVisible();

  await page.getByRole('button', { name: 'التقييمات' }).last().click();
  await expect(page.getByText('بانتظار المراجعة')).toBeVisible();
  await page.getByRole('button', { name: 'قبول' }).click();
  await expect.poll(async () => (await service.from('reviews').select('approved')).data?.[0]?.approved).toBe(true);

  // A signed-out visitor now sees it.
  const visitor = await context.browser()!.newPage({ baseURL: page.url().split('/').slice(0, 3).join('/') });
  await visitor.goto('/');
  await visitor.getByRole('button', { name: 'التقييمات' }).first().click();
  await expect(visitor.getByText('جميل جداً')).toBeVisible();
});
