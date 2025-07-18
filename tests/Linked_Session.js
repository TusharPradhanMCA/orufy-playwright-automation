const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const loginAndCreateLiveSession = async () => {
  const browser = await chromium.launch({
    headless: false,
    args: ['--start-maximized']
  });

  const context = await browser.newContext({ viewport: null });
  const page = await context.newPage();

  try {
    await page.goto('https://www.linkedin.com/login', { waitUntil: 'load' });

    const email = 'pradhantushar23@gmail.com';
    const password = 'tusharprice';

    await page.fill('input[name="session_key"]', email);
    await page.fill('input[name="session_password"]', password);

    const rememberMe = page.locator('input[name="rememberMeOptIn"]');
    if (await rememberMe.count()) {
      await rememberMe.check();
    }

    await page.click('button[aria-label="Sign in"]');
    await page.waitForLoadState('networkidle');

    const sessionPath = path.resolve(__dirname, "../json's/Linkedin-session.json");
    const dir = path.dirname(sessionPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const sessionData = await context.storageState();
    fs.writeFileSync(sessionPath, JSON.stringify(sessionData, null, 2));
    console.log('✅ New session file created at:', sessionPath);

  } catch (error) {
    console.error('❌ Error during LinkedIn login:', error);
  } finally {
    await browser.close();
  }
};

loginAndCreateLiveSession();
