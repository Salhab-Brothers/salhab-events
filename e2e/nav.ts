import type { Page } from '@playwright/test';

/** Opens a page from the navigation bar; on a phone the menu button has to be opened first. */
export async function nav(page: Page, label: string) {
  const menu = page.getByRole('button', { name: 'القائمة' });
  if (await menu.isVisible()) await menu.click();
  await page.getByRole('button', { name: label }).first().click();
}
