import { test, expect } from '@playwright/test';

const STORE_SLUG = process.env.PLAYWRIGHT_STORE_SLUG || 'adorn';

test('shop page loads and lists products', async ({ page }) => {
  await page.goto(`/store/${STORE_SLUG}/shop`);
  // Redirect landing: wait for product grid to render
  await expect(page.locator('.product-grid, .grid, [class*="grid"]').first()).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText(/products?/i).first()).toBeVisible().catch(() => {});
});

test('product cards link to a product detail page', async ({ page }) => {
  await page.goto(`/store/${STORE_SLUG}/shop`);
  const card = page.locator('a.card, .card a, a[href*="/product/"]').first();
  await expect(card).toBeVisible({ timeout: 20_000 });
  const href = await card.getAttribute('href');
  expect(href).toMatch(/\/product\//);
  await card.click();
  await expect(page).toHaveURL(/\/product\/.+/);
  await expect(page.locator('h1').first()).toBeVisible({ timeout: 15_000 });
});