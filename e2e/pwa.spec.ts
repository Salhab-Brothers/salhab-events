import { test, expect, type Page } from '@playwright/test';

// Runs against a production build (see playwright.config.ts), or the live site via E2E_BASE_URL.

const waitForWorker = async (page: Page) => {
  await page.goto('/');
  await page.evaluate(() => navigator.serviceWorker.ready);
  // The page itself becomes controlled once the worker has claimed it (a reload makes that certain).
  await page.reload();
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
};

test('the manifest and icons make the site installable', async ({ page, request }) => {
  await page.goto('/');
  await expect(page.locator('link[rel="manifest"]')).toHaveAttribute('href', '/manifest.json');
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute('content', '#016b6b');
  await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute('href', '/apple-touch-icon.png');

  const manifest = await (await request.get('/manifest.json')).json();
  expect(manifest).toMatchObject({ display: 'standalone', start_url: '/', scope: '/', lang: 'ar', dir: 'rtl' });
  const sizes = manifest.icons.map((i: { sizes: string; purpose?: string }) => `${i.sizes}:${i.purpose ?? ''}`);
  expect(sizes).toEqual(expect.arrayContaining(['192x192:any', '512x512:any', '512x512:maskable']));
  for (const icon of manifest.icons as { src: string; type: string }[]) {
    const res = await request.get(icon.src);
    expect(res.ok(), icon.src).toBe(true);
    expect(res.headers()['content-type']).toContain(icon.type);
  }
  expect((await request.get('/apple-touch-icon.png')).ok()).toBe(true);
});

test('the service worker takes control of the page', async ({ page }) => {
  await waitForWorker(page);
  const scope = await page.evaluate(async () => (await navigator.serviceWorker.getRegistration())?.scope);
  expect(scope).toBe(`${new URL(page.url()).origin}/`);
});

test('the app still opens offline and shows the retry message instead of data', async ({ page, context }) => {
  await waitForWorker(page);
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('button', { name: 'التقويم' }).first()).toBeVisible();   // the app shell is there
  // Data needs a connection: the app notices it is offline and says so straight away (no long spinner).
  await expect(page.getByText(/تعذّر تحميل البيانات/)).toBeVisible({ timeout: 3_000 });
  await context.setOffline(false);
});

test('only the app itself is cached, never data or login traffic', async ({ page }) => {
  await waitForWorker(page);
  await page.getByRole('button', { name: 'المناسبات' }).first().click();
  await page.waitForTimeout(1000);
  const cached = await page.evaluate(async () => {
    const urls: string[] = [];
    for (const name of await caches.keys()) {
      for (const req of await (await caches.open(name)).keys()) urls.push(req.url);
    }
    return urls;
  });
  expect(cached.length).toBeGreaterThan(0);
  const origin = new URL(page.url()).origin;
  for (const url of cached) {
    expect(url.startsWith(origin), url).toBe(true);
    expect(url).not.toMatch(/\/(rest|auth|functions)\/v1\//);
  }
});
