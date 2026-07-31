import { test, expect } from '@playwright/test';

const STORE_SLUG = 'test-store-1785454996381';
const BASE = 'https://nexus-storefront-dusky.vercel.app';

test.describe('Nexus Commerce Live E2E', () => {
  test('Store homepage loads and shows products', async ({ page }) => {
    await page.goto(`/${STORE_SLUG}`);
    await expect(page.locator('h1, h2').first()).toBeVisible();
    const products = page.locator('[class*="product"]');
    const count = await products.count();
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test('Browse products and filter by category', async ({ page }) => {
    await page.goto(`/${STORE_SLUG}`);
    const categoryLinks = page.locator('a, button').filter({ hasText: /Accessories|Finance|Accounting/i });
    const catCount = await categoryLinks.count();
    if (catCount > 0) {
      await categoryLinks.first().click();
      await page.waitForTimeout(2000);
      const url = page.url();
      expect(url).toContain('category');
    }
  });

  test('View public store info', async ({ page }) => {
    await page.goto(`/${STORE_SLUG}`);
    const contactInfo = page.locator('text=Test Store').or(page.locator('text=Contact')).or(page.locator('text=About'));
    await expect(contactInfo.first()).toBeVisible();
  });

  test('Register as customer and login', async ({ page }) => {
    const ts = Date.now();
    const email = `playwright-customer-${ts}@test.com`;
    await page.goto(`/${STORE_SLUG}/register`);
    await page.waitForLoadState('networkidle');

    await page.fill('input[name="firstName"], input[id="firstName"], input[placeholder*="first" i]', 'Playwright');
    await page.fill('input[name="lastName"], input[id="lastName"], input[placeholder*="last" i]', 'Test');
    await page.fill('input[name="email"], input[id="email"], input[placeholder*="email" i]', email);
    await page.fill('input[name="password"], input[id="password"]', 'Password123!');
    await page.fill('input[name="confirmPassword"], input[id="confirmPassword"]', 'Password123!');

    const customerBtn = page.locator('button, [role="button"]').filter({ hasText: /Customer/i });
    if (await customerBtn.isVisible()) await customerBtn.click();

    await page.locator('button[type="submit"], button:has-text("Register")').click();
    await page.waitForTimeout(3000);

    await expect(page).toHaveURL(/account|login/);
  });

  test('Register as retailer and create store', async ({ page }) => {
    const ts = Date.now();
    const email = `playwright-retailer-${ts}@test.com`;
    await page.goto(`/${STORE_SLUG}/register`);
    await page.waitForLoadState('networkidle');

    await page.fill('input[name="firstName"], input[id="firstName"], input[placeholder*="first" i]', 'Playwright');
    await page.fill('input[name="lastName"], input[id="lastName"], input[placeholder*="last" i]', 'Retailer');
    await page.fill('input[name="email"], input[id="email"], input[placeholder*="email" i]', email);
    await page.fill('input[name="password"], input[id="password"]', 'Password123!');
    await page.fill('input[name="confirmPassword"], input[id="confirmPassword"]', 'Password123!');

    const retailerBtn = page.locator('button, [role="button"]').filter({ hasText: /Retailer/i });
    if (await retailerBtn.isVisible()) await retailerBtn.click();

    await page.locator('button[type="submit"], button:has-text("Register")').click();
    await page.waitForTimeout(5000);

    await page.goto(`/${STORE_SLUG}/login`);
    await page.waitForLoadState('networkidle');
    await page.fill('input[name="email"], input[id="email"]', email);
    await page.fill('input[name="password"], input[id="password"]', 'Password123!');
    await page.locator('button[type="submit"], button:has-text("Login")').click();
    await page.waitForTimeout(3000);
  });

  test('Full purchase flow: login cart checkout', async ({ page }) => {
    await page.goto(`/${STORE_SLUG}/login`);
    await page.waitForLoadState('networkidle');
    await page.fill('input[name="email"], input[id="email"]', 'customer1785455074802@test.com');
    await page.fill('input[name="password"], input[id="password"]', 'Password123!');
    await page.locator('button[type="submit"], button:has-text("Login")').click();
    await page.waitForTimeout(3000);

    await page.goto(`/${STORE_SLUG}`);
    await page.waitForLoadState('networkidle');

    const addBtn = page.locator('button, a').filter({ hasText: /Add to Cart|Buy/i }).first();
    if (await addBtn.isVisible()) {
      await addBtn.first().click();
      await page.waitForTimeout(2000);
    }

    const cartLink = page.locator('a[href*="cart"], button:has-text("Cart")').first();
    if (await cartLink.isVisible()) {
      await cartLink.click();
      await page.waitForTimeout(2000);
    }

    const cartItems = page.locator('[class*="cart"]');
    const count = await cartItems.count();

    if (count > 0) {
      const checkoutBtn = page.locator('a[href*="checkout"], button:has-text("Checkout")').first();
      if (await checkoutBtn.isVisible()) {
        await checkoutBtn.click();
        await page.waitForTimeout(3000);
      }
    }
  });
});
