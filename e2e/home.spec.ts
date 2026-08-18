import { test, expect } from '@playwright/test';

test('home page renders for guests', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/Lyn-nyx|Stores|Commerce/i);
  // Header nav is present for navigation
  await expect(page.getByRole('link', { name: /home/i }).first()).toBeVisible();
  await expect(page.locator('main, [role="main"]').first()).toBeVisible();
});