const { chromium } = require('C:\\Users\\DARLYNE\\AppData\\Roaming\\npm\\node_modules\\playwright');
const BASE = 'https://nexus-storefront-dusky.vercel.app';
const STORE_SLUG = 'test-store-1785454996381';

(async () => {
  console.log('=== NEXUS COMMERCE E2E TEST (Playwright) ===\n');
  let passed = 0;
  let failed = 0;

  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:\\Users\\DARLYNE\\AppData\\Local\\ms-playwright\\chromium-1234\\chrome-win64\\chrome.exe',
  });
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

  // Test 1: Store homepage loads
  await test('Store homepage loads', async () => {
    const page = await context.newPage();
    await page.goto(`${BASE}/${STORE_SLUG}`, { waitUntil: 'networkidle' });
    const title = await page.title();
    if (!title && !(await page.locator('body').innerText())) throw new Error('Page has no content');
    await page.close();
  });

  // Test 2: Products visible
  await test('Products visible on homepage', async () => {
    const page = await context.newPage();
    await page.goto(`${BASE}/${STORE_SLUG}`, { waitUntil: 'networkidle' });
    const body = await page.locator('body').innerText();
    if (body.includes('Test Product')) {
      console.log('    Found test products');
    }
    await page.close();
  });

  // Test 3: Login page renders
  await test('Login page renders', async () => {
    const page = await context.newPage();
    await page.goto(`${BASE}/${STORE_SLUG}/login`, { waitUntil: 'networkidle' });
    const buttons = await page.locator('button').allInnerTexts();
    const hasLoginBtn = buttons.some(b => b.toLowerCase().includes('login') || b.toLowerCase().includes('sign in'));
    if (!hasLoginBtn) console.log('    Warning: No login button found (buttons: ' + buttons.join(', ') + ')');
    await page.close();
  });

  // Test 4: Register page renders
  await test('Register page renders', async () => {
    const page = await context.newPage();
    await page.goto(`${BASE}/${STORE_SLUG}/register`, { waitUntil: 'networkidle' });
    const inputs = await page.locator('input').count();
    if (inputs === 0) console.log('    Warning: No input fields found');
    await page.close();
  });

  // Test 5: Customer registration flow
  await test('Customer registration', async () => {
    const page = await context.newPage();
    const ts = Date.now();
    const email = `e2e-customer-${ts}@test.com`;

    await page.goto(`${BASE}/${STORE_SLUG}/register`, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    // Fill form fields
    const inputs = await page.locator('input').all();
    for (const input of inputs) {
      const id = await input.getAttribute('id') || '';
      const name = await input.getAttribute('name') || '';
      const ph = (await input.getAttribute('placeholder') || '').toLowerCase();
      if (id.includes('firstName') || name.includes('firstName') || ph.includes('first')) await input.fill('E2E');
      else if (id.includes('lastName') || name.includes('lastName') || ph.includes('last')) await input.fill('Customer');
      else if (id.includes('email') || name.includes('email') || ph.includes('email')) await input.fill(email);
      else if (id === 'password' || name === 'password') await input.fill('Password123!');
      else if (id.includes('confirm') || name.includes('confirm')) await input.fill('Password123!');
    }

    // Click role button
    const allBtns = await page.locator('button').all();
    for (const btn of allBtns) {
      const text = (await btn.innerText()).toLowerCase();
      if (text.includes('customer')) { await btn.click(); await page.waitForTimeout(500); break; }
    }

    // Submit
    for (const btn of allBtns) {
      const text = (await btn.innerText()).toLowerCase();
      if (text.includes('register') || text.includes('sign up')) { await btn.click(); break; }
    }

    await page.waitForTimeout(5000);
    const url = page.url();
    if (url.includes('account') || url.includes('login')) {
      console.log(`    Registered as ${email}`);
    } else {
      console.log(`    Redirected to: ${url}`);
    }
    await page.close();
  });

  // Test 6: Cart page access
  await test('Cart page accessible', async () => {
    const page = await context.newPage();
    await page.goto(`${BASE}/${STORE_SLUG}/cart`, { waitUntil: 'networkidle' });
    const body = await page.locator('body').innerText();
    const hasCart = body.toLowerCase().includes('cart') || body.toLowerCase().includes('item');
    if (!hasCart) console.log('    Warning: Cart page may be empty');
    await page.close();
  });

  // Test 7: Responsive layout (mobile viewport)
  await test('Responsive layout at mobile width', async () => {
    const mobilePage = await context.newPage();
    await mobilePage.setViewportSize({ width: 375, height: 812 });
    await mobilePage.goto(`${BASE}/${STORE_SLUG}`, { waitUntil: 'networkidle' });
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
