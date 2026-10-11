import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  page.on('pageerror', err => console.log(`[BROWSER ERROR] ${err.toString()}`));

  console.log("Navigating to login...");
  await page.goto('http://localhost:5173/login');
  await page.fill('input[type="tel"]', '+91 82484 56747');
  await page.click('button[type="submit"]');
  await page.waitForSelector('input#login-otp');
  await page.fill('input#login-otp', '123456');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/', { timeout: 15000 });
  
  for(let i=1; i<=3; i++) {
    console.log(`\n=== ITERATION ${i} ===`);
    await page.goto('http://localhost:5173/dashboard/myDashboard');
    await page.waitForSelector('a[href="/dashboard/myOrders"]');

    console.log('--- CLICK 1 (My Orders) ---');
    await page.click('a[href="/dashboard/myOrders"]');
    await page.waitForTimeout(1000);
    console.log('URL:', page.url());
    
    console.log('--- CLICK 2 (Wishlist) ---');
    await page.click('a[href="/dashboard/wishlist"]');
    await page.waitForTimeout(1000);
    console.log('URL:', page.url());

    console.log('--- CLICK 3 (Address Book) ---');
    await page.click('a[href="/dashboard/myAddress"]');
    await page.waitForTimeout(1000);
    console.log('URL:', page.url());
  }

  await browser.close();
})();
