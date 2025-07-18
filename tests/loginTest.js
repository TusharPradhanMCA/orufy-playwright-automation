const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({
    headless: false,
    args: ['--start-maximized']
  });

  // No storageState here = always start fresh
  const context = await browser.newContext({
    viewport: null
  });

  const page = await context.newPage();

  await page.goto('https://orufy.com/login?redirect=CHAT_APP');

  // Login sequence
  await page.waitForSelector('input[name="emailId"]', { timeout: 10000 });
  await page.fill('input[name="emailId"]', 'tushar@orufy.com');
  await page.fill('input[name="password"]', 'Orufy@123');
  await Promise.all([
    page.waitForNavigation(),
    page.click('button[aria-label="sign in"]'),
  ]);

  // Wait for dashboard
  await page.waitForSelector('text=Orufy Live Testing', { timeout: 10000 });
  await page.click('text=Orufy Live Testing');

  await page.waitForTimeout(5000);
  await page.screenshot({ path: 'loggedin.png' });

  await browser.close();
})();
