import { test, expect, type Page } from '@playwright/test';
import { loginAsAdmin, resetData, seedAdmin, service } from './helpers';

// Screenshots of every page at phone, tablet and desktop size, compared with committed baselines.
// This is the test that notices what the other specs cannot: a word missing from the header, a
// card that wraps badly, a button that sits in the wrong place. A failed run uploads the new,
// the old and the difference image. If the change is on purpose, make new baselines with the
// "visual-baselines" workflow and commit them with the change.
//
// Everything that could differ between runs is pinned: the clock, the data (fixed dates and
// names), the fonts (waited for) and the captcha widget (masked).
const NOW = new Date('2026-11-13T09:00:00');
const SIZES = {
  phone: { width: 390, height: 844 },
  tablet: { width: 768, height: 1024 },
  desktop: { width: 1280, height: 800 },
} as const;
type Size = keyof typeof SIZES;

const NAMES = [
  'عبدالرحمن أمجد عمران سلهب', 'محمود عيد طلب سلهب', 'فادي محمد وائل تحسين سلهب بن أبو عبدالله',
  'سهرة أحمد جواد سرحان سلهب', 'ياسر زيدان سلهب',
];
const SLOTS = ['lunch', 'afternoon', 'wedding', 'full'] as const;
const pad = (n: number) => String(n).padStart(2, '0');

test.beforeAll(seedAdmin);

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(NOW);
  await resetData();
  await service.from('bookings').insert(Array.from({ length: 14 }, (_, i) => {
    const d = new Date(2026, 10, 16 + i * 17);
    return {
      date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
      event_name: `${i % 2 ? 'زفاف' : 'غداء وزفاف'} ${NAMES[i % NAMES.length]}`,
      time_slot: SLOTS[i % 4],
      person_name: NAMES[(i + 2) % NAMES.length],
      phone: '0501110000',
      status: 'confirmed',
      book_diwan: i % 3 === 0,
      created_date: '2026-10-01T10:00:00Z',
    };
  }));
  await service.from('booking_requests').insert([0, 1, 2].map(i => ({
    first_name: 'محمد', second_name: 'أحمد', third_name: 'عبدالله', last_name: 'سلهب', phone: '0507776655',
    date: `2026-12-${pad(5 + i)}`, time_slot: SLOTS[i], event_name: `حفل زفاف ${NAMES[i]}`, status: i === 2 ? 'approved' : 'pending',
    submitted_at: `2026-11-0${i + 1}T10:00:00Z`, created_date: `2026-11-0${i + 1}T10:00:00Z`,
  })));
  await service.from('reviews').insert([
    { reviewer_name: NAMES[0], rating: 5, comment: 'تجربة رائعة جداً وتنظيم ممتاز', approved: true, created_date: '2026-11-02T10:00:00Z' },
    { reviewer_name: NAMES[1], event_name: 'زفاف', rating: 4, approved: true, created_date: '2026-11-03T10:00:00Z' },
    { reviewer_name: NAMES[2], rating: 5, comment: 'ينتظر المراجعة', approved: false, created_date: '2026-11-04T10:00:00Z' },
  ]);
});

async function snap(page: Page, name: string, size: Size, wait = 1000) {
  await page.setViewportSize(SIZES[size]);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(wait);   // fade-in and chart animations
  await expect(page).toHaveScreenshot(`${name}-${size}.png`, {
    fullPage: true,
    animations: 'disabled',
    mask: [page.getByTestId('captcha')],
    maxDiffPixelRatio: 0.002,
  });
}

async function darkMode(page: Page) {
  await page.getByRole('button', { name: 'الوضع الداكن' }).click();
  await expect(page.locator('html')).toHaveClass(/dark/);
}

for (const size of Object.keys(SIZES) as Size[]) {
  for (const id of ['calendar', 'events', 'request', 'reviews', 'stats', 'admin']) {
    test(`${id} page looks right (${size})`, async ({ page }) => {
      await page.setViewportSize(SIZES[size]);
      await page.goto(`/#/${id}`);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await snap(page, id === 'admin' ? 'sign-in' : id, size, id === 'stats' ? 2000 : 1000);
    });
  }
}

for (const size of ['phone', 'desktop'] as const) {
  for (const id of ['calendar', 'events']) {
    test(`${id} page looks right in dark mode (${size})`, async ({ page }) => {
      await page.setViewportSize(SIZES[size]);
      await page.goto(`/#/${id}`);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await darkMode(page);
      await snap(page, `${id}-dark`, size);
    });
  }

  for (const [tab, name] of [['الطلبات', 'requests'], ['الحجوزات', 'bookings'], ['إضافة حجز', 'add'], ['تحميل الصورة', 'image']] as const) {
    test(`admin ${name} tab looks right (${size})`, async ({ page }) => {
      await page.setViewportSize(SIZES[size]);
      await loginAsAdmin(page);
      await expect(page.getByRole('heading', { name: 'لوحة الإدارة' })).toBeVisible();
      await page.locator('main').getByRole('button', { name: new RegExp('^' + tab) }).click();
      await snap(page, `admin-${name}`, size);
    });
  }
}
