import { test, expect } from '@playwright/test';
import { anon, resetData, service, SUBMIT_URL, futureDate, nav } from './helpers';

test.beforeEach(resetData);

test('visitors see events but never phone numbers', async ({ page }) => {
  await service.from('bookings').insert({
    date: futureDate(10), event_name: 'عرس الاختبار', time_slot: 'lunch',
    person_name: 'أبو الاختبار', phone: '0509998877', status: 'confirmed',
  });
  await page.goto('/');
  await nav(page, 'المناسبات');
  await expect(page.getByText('عرس الاختبار')).toBeVisible();
  await expect(page.locator('body')).not.toContainText('0509998877');
});

test('booking request goes through the captcha and is stored as pending', async ({ page }) => {
  await page.goto('/');
  await nav(page, 'طلب حجز');
  await page.getByLabel('الاسم الأول').fill('خالد');
  await page.getByLabel('اسم العائلة').fill('سلهب');
  await page.getByLabel('رقم الهاتف').fill('0501234567');
  await page.locator('input[type="date"]').fill(futureDate());
  await page.getByLabel('اسم المناسبة').fill('تجمع');

  const send = page.getByRole('button', { name: /إرسال/ });
  await expect(send).toBeDisabled();                         // captcha not solved yet
  await expect(send).toBeEnabled({ timeout: 30_000 });       // test key auto-passes
  await send.click();

  await expect(page.getByText('تم إرسال طلبك بنجاح')).toBeVisible();
  const { data } = await service.from('booking_requests').select('*');
  expect(data).toHaveLength(1);
  expect(data![0]).toMatchObject({ first_name: 'خالد', status: 'pending', event_name: 'تجمع' });
});

test('review waits for approval and is hidden from the public list', async ({ page }) => {
  await page.goto('/');
  await nav(page, 'التقييمات');
  await page.getByLabel('اسمك').fill('سارة');
  await page.getByRole('button', { name: '5 من 5' }).click();
  await page.getByLabel('تعليقك').fill('تجربة ممتازة');

  const send = page.getByRole('button', { name: /إرسال التقييم/ });
  await expect(send).toBeEnabled({ timeout: 30_000 });
  await send.click();

  await expect(page.getByText(/شكراً/)).toBeVisible();
  const { data } = await service.from('reviews').select('*');
  expect(data).toHaveLength(1);
  expect(data![0]).toMatchObject({ reviewer_name: 'سارة', rating: 5, approved: false });
  await expect(page.getByText('تجربة ممتازة')).toHaveCount(0);
});

test('the database refuses what the site should never allow', async () => {
  const row = { first_name: 'x', last_name: 'y', phone: '1', date: futureDate(), time_slot: 'lunch', event_name: 'e' };
  // Direct inserts must go through the captcha-checking function.
  expect((await anon.from('booking_requests').insert(row)).error).not.toBeNull();
  expect((await anon.from('reviews').insert({ reviewer_name: 'x', rating: 5 })).error).not.toBeNull();
  // Phones and requests stay private.
  expect((await anon.from('bookings').select('phone')).error).not.toBeNull();
  const requests = await anon.from('booking_requests').select('*');
  expect(requests.error ?? requests.data).toBeTruthy();
  expect(requests.data ?? []).toHaveLength(0);
});

test('the submit function rejects a request with no captcha token', async ({ request }) => {
  // (A fake token is only refused with a real secret; the local test secret accepts any token.)
  const res = await request.post(SUBMIT_URL, { data: { kind: 'review', row: { reviewer_name: 'x', rating: 5 } } });
  expect(res.status()).toBe(403);
  const { data } = await service.from('reviews').select('id');
  expect(data).toHaveLength(0);
});
