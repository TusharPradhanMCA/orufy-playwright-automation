const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({
    headless: false,
    args: ['--start-maximized']
  });

  const context = await browser.newContext({
    viewport: null
  });

  const page = await context.newPage();

  await page.goto('https://betacms.orufy.in/admin', { waitUntil: 'domcontentloaded' });

  // Fill login details
  await page.fill('input[name="email"]', 'tushar@orufy.com');
  await page.fill('input[name="password"]', 'Orufy@123');
  await page.check('input[name="rememberMe"]');

 await Promise.all([
  page.waitForNavigation({ waitUntil: 'networkidle' }),
  page.click('button:has-text("Login")') // or use 'text="Login"' if needed
]);


  console.log('✅ Logged in successfully. Saving session...');

  // Save the session state
  const storagePath = path.join(__dirname, '../json\'s/cms-orufy-session.json');
  await context.storageState({ path: storagePath });

  console.log(`✅ Session saved to ${storagePath}`);

  await browser.close();
})();
