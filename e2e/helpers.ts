import { createClient } from '@supabase/supabase-js';
import type { Page } from '@playwright/test';
import { nav } from './nav';

const url = process.env.VITE_SUPABASE_URL ?? '';
export const SUBMIT_URL = `${url}/functions/v1/submit`;
export const anon = createClient(url, process.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? '', { auth: { persistSession: false } });
export const service = createClient(url, process.env.E2E_SERVICE_KEY ?? '', { auth: { persistSession: false } });

export const ADMIN_PHONE = '0501112233';
export const ADMIN_PASSWORD = 'e2e-Password-123';
const ADMIN_EMAIL = '972501112233@admin.example.com';

/** Empties the data tables so each test starts clean. */
export async function resetData() {
  for (const table of ['reviews', 'booking_requests', 'bookings']) {
    const { error } = await service.from(table).delete().not('id', 'is', null);
    if (error) throw error;
  }
}

/** Makes sure the test admin exists (idempotent). */
export async function seedAdmin() {
  const { data: list } = await service.auth.admin.listUsers();
  let user = list?.users.find((u) => u.email === ADMIN_EMAIL);
  if (!user) {
    const { data, error } = await service.auth.admin.createUser({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD, email_confirm: true });
    if (error) throw error;
    user = data.user;
  }
  const { error } = await service.from('admins').upsert({ user_id: user.id });
  if (error) throw error;
}

export const futureDate = (daysAhead = 400) => new Date(Date.now() + daysAhead * 864e5).toISOString().slice(0, 10);

export { nav };

export async function loginAsAdmin(page: Page) {
  await page.goto('/');
  await nav(page, 'الإدارة');
  await page.getByLabel('رقم الهاتف').fill(ADMIN_PHONE);
  await page.getByLabel('كلمة المرور', { exact: true }).fill(ADMIN_PASSWORD);
  await page.getByRole('button', { name: 'دخول' }).click();
}
