import { test, expect, type Page } from '@playwright/test';
import { loginAsAdmin, resetData, seedAdmin, service, futureDate } from './helpers';

// Layout checks at the widths people really use, with a data set that is awkward on purpose
// (long names, many months). The viewport is set per test, so this runs on the chromium project.
//   - nothing is wider than the screen (no sideways scrolling; this also catches a captcha widget that
//     is too wide, since it lives in a closed shadow root that the test cannot look into)
//   - every control is big enough to tap (the WCAG 2.5.8 floor), form fields comfortably so on phones
//   - the narrow form pages sit in the middle of a wide screen instead of against one edge
const WIDTHS = [320, 360, 390, 768, 1024, 1440];
const PUBLIC_PAGES = ['calendar', 'events', 'request', 'reviews', 'stats', 'admin'];
const ADMIN_TABS = ['الطلبات', 'الحجوزات', 'إضافة حجز', 'التقييمات', 'تحميل الصورة'];
const TAP_FLOOR = 24;
const PHONE_FIELD_HEIGHT = 40;

const NAMES = [
  'عبدالرحمن أمجد عمران سلهب', 'محمود عيد طلب سلهب', 'فادي محمد وائل تحسين سلهب بن أبو عبدالله',
  'سهرة أحمد جواد سرحان سلهب', 'ياسر زيدان سلهب',
];
const SLOTS = ['lunch', 'afternoon', 'wedding', 'full'] as const;

test.beforeAll(seedAdmin);

test.beforeEach(async () => {
  await resetData();
  await service.from('bookings').insert(Array.from({ length: 16 }, (_, i) => ({
    date: futureDate(10 + i * 21),
    event_name: `${i % 2 ? 'زفاف' : 'غداء وزفاف'} ${NAMES[i % NAMES.length]}`,
    time_slot: SLOTS[i % 4],
    person_name: NAMES[(i + 2) % NAMES.length],
    phone: '0501110000',
    status: 'confirmed',
    book_diwan: i % 3 === 0,
  })));
  await service.from('booking_requests').insert([0, 1].map(i => ({
    first_name: 'محمد', second_name: 'أحمد', third_name: 'عبدالله', last_name: 'سلهب', phone: '0507776655',
    date: futureDate(30 + i), time_slot: SLOTS[i], event_name: `حفل زفاف ${NAMES[i]}`, status: 'pending',
  })));
  await service.from('reviews').insert([
    { reviewer_name: 'ليلى', rating: 4, comment: 'جميل جداً', approved: true },
    { reviewer_name: 'نور', rating: 5, comment: 'ينتظر المراجعة', approved: false },
  ]);
});

async function setWidth(page: Page, width: number) {
  await page.setViewportSize({ width, height: width < 768 ? 800 : 900 });
}

/** Text of everything wrong with the current page at this width (empty when it is fine). */
async function layoutProblems(page: Page, width: number): Promise<string[]> {
  return page.evaluate(({ width, floor, phoneField }) => {
    const problems: string[] = [];
    const root = document.documentElement;
    if (root.scrollWidth > root.clientWidth) {
      problems.push(`scrolls sideways (${root.scrollWidth}px of ${root.clientWidth}px)`);
    }
    const visible = (el: Element) => {
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0 && getComputedStyle(el).visibility !== 'hidden' && !el.closest('.sr-only, [aria-hidden="true"]');
    };
    for (const el of document.querySelectorAll<HTMLElement>('button, input, select, textarea, [role="button"], [role="combobox"]')) {
      if (!visible(el)) continue;
      const input = el as HTMLInputElement;
      // A checkbox is tapped through its label, so the label is the real target.
      const box = (input.type === 'checkbox' || input.type === 'radio' ? el.closest('label') ?? el : el).getBoundingClientRect();
      const name = `${el.tagName.toLowerCase()} "${(el.getAttribute('aria-label') ?? el.textContent ?? input.id ?? '').trim().slice(0, 24)}"`;
      if (Math.min(box.width, box.height) < floor) {
        problems.push(`${name} is ${Math.round(box.width)}x${Math.round(box.height)}px, too small to tap`);
      }
      const isField = ['INPUT', 'TEXTAREA'].includes(el.tagName) && !['checkbox', 'radio', 'hidden'].includes(input.type);
      if (width < 768 && isField && box.height < phoneField) {
        problems.push(`${name} is ${Math.round(box.height)}px tall, fields should be at least ${phoneField}px on a phone`);
      }
    }
    return problems;
  }, { width, floor: TAP_FLOOR, phoneField: PHONE_FIELD_HEIGHT });
}

for (const width of WIDTHS) {
  test(`public pages fit and are tappable at ${width}px`, async ({ page }) => {
    await setWidth(page, width);
    const problems: string[] = [];
    for (const id of PUBLIC_PAGES) {
      await page.goto(`/#/${id}`);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await expect(page.locator('header').getByText('مناسبات', { exact: true })).toBeVisible();   // the full name, also on a phone
      await page.waitForTimeout(id === 'request' || id === 'reviews' ? 1500 : 500);   // captcha widget, fade-in
      problems.push(...(await layoutProblems(page, width)).map(p => `#/${id}: ${p}`));
    }
    expect(problems).toEqual([]);
  });

  test(`admin tabs fit and are tappable at ${width}px`, async ({ page }) => {
    await setWidth(page, width);
    await loginAsAdmin(page);
    await expect(page.getByRole('heading', { name: 'لوحة الإدارة' })).toBeVisible();
    const problems: string[] = [];
    for (const tab of ADMIN_TABS) {
      await page.locator('main').getByRole('button', { name: new RegExp('^' + tab) }).click();
      await page.waitForTimeout(500);
      problems.push(...(await layoutProblems(page, width)).map(p => `${tab}: ${p}`));
    }
    expect(problems).toEqual([]);
  });
}

test('the header menu button replaces the inline navigation below 1024px', async ({ page }) => {
  await setWidth(page, 768);
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'القائمة' })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'التنقل الرئيسي' })).toBeHidden();
  await setWidth(page, 1024);
  await expect(page.getByRole('button', { name: 'القائمة' })).toBeHidden();
  const items = page.getByRole('navigation', { name: 'التنقل الرئيسي' }).getByRole('button');
  for (const item of await items.all()) {
    expect((await item.boundingBox())?.height).toBeLessThan(48);   // a label that wraps to two lines is taller
  }
});

for (const id of ['request', 'reviews']) {
  test(`the ${id} form is centred on a wide screen`, async ({ page }) => {
    await setWidth(page, 1440);
    await page.goto(`/#/${id}`);
    const box = await page.locator('main form').boundingBox();
    expect(box).not.toBeNull();
    const left = box!.x;
    const right = 1440 - (box!.x + box!.width);
    expect(Math.abs(left - right)).toBeLessThanOrEqual(2);
  });
}
