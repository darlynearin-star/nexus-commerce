import { test, expect } from '@playwright/test';

test('landing page visual elements are intact', async ({ page }) => {
  const consoleErrors: string[] = [];
  const brokenImages: string[] = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err) => consoleErrors.push(`pageerror: ${err.message}`));
  page.on('requestfailed', (req) => {
    if (req.resourceType() === 'image' || req.url().includes('/api/')) {
      brokenImages.push(`${req.resourceType()}: ${req.url()}`);
    }
  });

  await page.goto('/');
  await expect(page).toHaveTitle(/Lyn-nyx|Stores|Commerce/i);

  // 1. Bigger Fraunces headline + gold accent
  const headline = page.locator('h1').first();
  await expect(headline).toBeVisible();
  const h1Text = (await headline.textContent()) || '';
  expect(h1Text).toContain('in minutes');

  // 2. Hero background image cycle container
  await expect(page.locator('.hero-bg-cycle')).toBeVisible();

  // 3. Dynamic product showcase (hero)
  const showcase = page.locator('.hero-showcase');
  await expect(showcase).toBeAttached();
  // Skeleton shows before products load; wait for either skeleton cards or product cards
  const showcaseCards = showcase.locator('.card');
  await expect(showcaseCards.first()).toBeVisible({ timeout: 30_000 });
  const cardCount = await showcaseCards.count();
  expect(cardCount).toBeGreaterThan(0);

  // 4. Animated trust strip
  const trustPills = page.locator('.trust-pill');
  const trustCount = await trustPills.count();
  expect(trustCount).toBeGreaterThanOrEqual(3);
  await expect(trustPills.first()).toBeVisible();

  // 5. Scrolling marquee
  const marquee = page.locator('.marquee-track');
  await expect(marquee).toBeVisible();
  expect(await marquee.locator('.marquee-item').count()).toBeGreaterThanOrEqual(4);

  // 6. Bento grid features
  const bento = page.locator('.bento-grid');
  await expect(bento).toBeVisible();
  expect(await bento.locator('.card').count()).toBeGreaterThanOrEqual(4);
  // bento-large hero card exists
  await expect(bento.locator('.bento-lg').first()).toBeVisible();

  // 7. Full-bleed template previews (4)
  const templates = page.locator('.template-preview');
  await expect(templates.first()).toBeVisible({ timeout: 20_000 });
  expect(await templates.count()).toBe(4);

  // 8. Scroll-triggered reveal hooks present
  expect(await page.locator('[data-reveal]').count()).toBeGreaterThan(0);

  // 9. How it works section
  await expect(page.getByText(/how it works/i).first()).toBeVisible();

  // 10. Final CTA
  await expect(page.getByRole('link', { name: /start your free trial/i }).first()).toBeVisible();

  // Screenshots
  await page.screenshot({ path: 'test-results/landing-top.png', fullPage: false });
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(800);
  await page.screenshot({ path: 'test-results/landing-bottom.png', fullPage: false });

  await page.screenshot({ path: 'test-results/landing-full.png', fullPage: true });

  // Report broken images (ignore expected API flakes that degrade gracefully)
  const brokenRealImages = brokenImages.filter((b) => b.startsWith('image:'));
  expect(brokenRealImages).toEqual([]);

  // Report script errors (allow known network/API flake errors)
  const fatalErrors = consoleErrors.filter((e) => !/net::|Failed to fetch|ERR_|ECONN|timeout/i.test(e));
  expect(fatalErrors).toEqual([]);
});
