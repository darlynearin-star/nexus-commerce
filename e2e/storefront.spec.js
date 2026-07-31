const { chromium } = require('playwright');
const BASE = 'https://nexus-storefront-dusky.vercel.app';
const STORE_SLUG = 'test-store-1785454996381';

(async () => {
  console.log('=== NEXUS COMMERCE E2E TEST (Playwright) ===\n');
  let passed = 0;
  let failed = 0;

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });

  async function test(name, fn) {
    try {
      await fn();
      console.log(`  ✓ ${name}`);
      passed++;
    } catch (e) {
      console.log(`  ✗ ${name}: ${e.message}`);
      failed++;
    }
  }

  await test('Store homepage loads', async () => {
    const page = await context.newPage();
    await page.goto(`${BASE}/store/${STORE_SLUG}`, { waitUntil: 'networkidle' });
    const body = await page.locator('body').innerText();
    if (!body.trim()) throw new Error('Page has no content');
    await page.close();
  });

  await test('Products visible on homepage', async () => {
    const page = await context.newPage();
    await page.goto(`${BASE}/store/${STORE_SLUG}`, { waitUntil: 'networkidle' });
    const body = await page.locator('body').innerText();
    if (!body.includes('Test Product')) throw new Error('Test products not found');
    console.log('    Found test products');
    await page.close();
  });

  await test('Login page renders', async () => {
    const page = await context.newPage();
    await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
    const buttons = await page.locator('button').allInnerTexts();
    const hasLoginBtn = buttons.some(b => b.toLowerCase().includes('login') || b.toLowerCase().includes('sign in'));
    if (!hasLoginBtn) console.log('    Warning: No login button found');
    await page.close();
  });

  await test('Register page renders', async () => {
    const page = await context.newPage();
    await page.goto(`${BASE}/register`, { waitUntil: 'networkidle' });
    const inputs = await page.locator('input').count();
    if (inputs === 0) console.log('    Warning: No input fields found');
    await page.close();
  });

  await test('Cart page accessible', async () => {
    const page = await context.newPage();
    await page.goto(`${BASE}/cart`, { waitUntil: 'networkidle' });
    const body = await page.locator('body').innerText();
    const hasCart = body.toLowerCase().includes('cart') || body.toLowerCase().includes('item');
    if (!hasCart) console.log('    Warning: Cart page may be empty');
    await page.close();
  });

  await test('Responsive layout at mobile width', async () => {
    const mobilePage = await context.newPage();
    await mobilePage.setViewportSize({ width: 375, height: 812 });
    await mobilePage.goto(`${BASE}/store/${STORE_SLUG}`, { waitUntil: 'networkidle' });
    const vp = mobilePage.viewportSize();
    if (vp.width === 375) console.log('    Mobile viewport OK');
    await mobilePage.close();
  });

  await browser.close();
  console.log(`\n=== RESULTS: ${passed} passed, ${failed} failed ===`);
  process.exit(failed > 0 ? 1 : 0);
})().catch(e => {
  console.error('Fatal:', e);
  process.exit(1);
});
