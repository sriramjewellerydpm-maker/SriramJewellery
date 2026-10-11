import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();
  
  // Login first
  await page.goto('http://localhost:5173/login');
  
  // Wait for login form
  await page.waitForSelector('input[type="tel"]');
  await page.type('input[type="tel"]', '+91 82484 56747');
  await page.click('button[type="submit"]');
  
  // Wait for OTP input
  await page.waitForSelector('input[type="text"]');
  // Type 123456
  for (let i = 0; i < 6; i++) {
    await page.keyboard.press((i + 1).toString());
  }
  
  // Should redirect to dashboard
  await page.waitForNavigation();
  console.log('Current URL after login:', page.url());
  
  // Now on dashboard, click 'My Orders'
  await page.waitForSelector('a[href="/dashboard/myOrders"]');
  
  // Log any console errors during clicks
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('BROWSER ERROR:', msg.text());
    }
  });

  console.log('Clicking My Orders...');
  await page.click('a[href="/dashboard/myOrders"]');
  await new Promise(r => setTimeout(r, 1000));
  console.log('URL after first click:', page.url());
  let content = await page.$eval('main', el => el.innerText);
  console.log('Main content preview:', content.substring(0, 50).replace(/\n/g, ' '));
  
  console.log('Clicking Wishlist...');
  await page.click('a[href="/dashboard/wishlist"]');
  await new Promise(r => setTimeout(r, 1000));
  console.log('URL after second click:', page.url());
  content = await page.$eval('main', el => el.innerText);
  console.log('Main content preview:', content.substring(0, 50).replace(/\n/g, ' '));
  
  console.log('Clicking Address Book...');
  await page.click('a[href="/dashboard/myAddress"]');
  await new Promise(r => setTimeout(r, 1000));
  console.log('URL after third click:', page.url());
  
  await browser.close();
})();
