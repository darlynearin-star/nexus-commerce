import { test, expect } from '@playwright/test';

const STORE_SLUG = process.env.PLAYWRIGHT_STORE_SLUG || 'adorn';

test('guest can open a product page', async ({ page }) => {
  await page.goto(`/store/${STORE_SLUG}/shop`);
  const card = page.locator('a[href*="/product/"]').first();
  await card.waitFor({ state: 'visible', timeout: 30_000 });
  const href = (await card.getAttribute('href')) as string;
  await page.goto(href);
  await expect(page.locator('h1').first()).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText(/add to cart|sign in to purchase/i).first()).toBeVisible();
});

test('add to cart is available to guests on a product page (TASK-044)', async ({ page }) => {
  await page.goto(`/store/${STORE_SLUG}/shop`);
  const card = page.locator('a[href*="/product/"]').first();
  await card.waitFor({ state: 'visible', timeout: 30_000 });
  await card.click();
  await expect(page).toHaveURL(/\/product\//, { timeout: 30_000 });

  await expect(page.locator('h1').first()).toBeVisible({ timeout: 30_000 });
  // Guests no longer see a login gate: the add-to-cart button is always available.
  await expect(page.getByRole('button', { name: /add to cart/i }).first()).toBeVisible();
});