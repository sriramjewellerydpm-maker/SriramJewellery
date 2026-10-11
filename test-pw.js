import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();

  page.on('console', msg => console.log(`[BROWSER CONSOLE] ${msg.type()}: ${msg.text()}`));
  page.on('pageerror', err => console.log(`[BROWSER ERROR] ${err.toString()}`));

  console.log("Navigating to login...");
  await page.goto('http://localhost:5173/login');

  console.log("Filling login phone...");
  await page.waitForSelector('input[type="tel"]');
  await page.fill('input[type="tel"]', '+91 82484 56747');
  await page.click('button[type="submit"]');

  console.log("Waiting for OTP input...");
  await page.waitForSelector('input#login-otp');
  console.log("Typing OTP and submitting...");
  await page.fill('input#login-otp', '123456');
  await page.click('button[type="submit"]');

  console.log("Waiting for login redirect...");
  await page.waitForURL('**/', { timeout: 15000 });
  
  console.log("Navigating to dashboard explicitly...");
  await page.goto('http://localhost:5173/dashboard/myDashboard');
  await page.waitForSelector('a[href="/dashboard/myOrders"]');

  console.log('--- FIRST CLICK (My Orders) ---');
  await page.click('a[href="/dashboard/myOrders"]');
  await page.waitForTimeout(2000);
  console.log('URL after FIRST click:', page.url());
  
  const content1 = await page.locator('main').innerText();
  console.log('Main content preview:', content1.substring(0, 50).replace(/\n/g, ' '));

  console.log('--- SECOND CLICK (Wishlist) ---');
  await page.click('a[href="/dashboard/wishlist"]');
  await page.waitForTimeout(2000);
  console.log('URL after SECOND click:', page.url());
  
  const content2 = await page.locator('main').innerText();
  console.log('Main content preview:', content2.substring(0, 50).replace(/\n/g, ' '));

  await browser.close();
})();
