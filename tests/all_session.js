const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const loginAndSaveSession = async (envName, loginUrl, email, password, businessName) => {
  const browser = await chromium.launch({
    headless: false,
    args: ['--start-maximized']
  });

  const context = await browser.newContext({ viewport: null });
  const page = await context.newPage();

  await page.goto(loginUrl);

  await page.waitForSelector('input[name="emailId"]');
  await page.fill('input[name="emailId"]', email);
  await page.fill('input[name="password"]', password);
  await page.click('button[aria-label="sign in"]');

  await page.waitForTimeout(3000);

  await page.waitForSelector(`text=${businessName}`, { timeout: 10000 });
  await page.click(`text=${businessName}`);

  await page.waitForTimeout(3000);

  const screenshotPath = path.resolve(__dirname, `../screenshots/${envName}-loggedin.png`);
  await page.screenshot({ path: screenshotPath });

  const sessionPath = path.resolve(__dirname, `../json's/${envName}-orufy-session.json`);
  const storage = await context.storageState();
  fs.writeFileSync(sessionPath, JSON.stringify(storage));

  await browser.close();
};

(async () => {
  await Promise.all([
    loginAndSaveSession(
      'beta',
      'https://beta.orufy.in/login?redirect=CHAT_APP',
      'tushar@orufy.com',
      'Orufy@123',
      'tushar cop'
    ),
    loginAndSaveSession(
      'staging',
      'https://staging.orufy.in/login?redirect=CHAT_APP',
      'tushar@orufy.com',
      'Orufy@123',
      'Orufy Live Testing'
    ),
    loginAndSaveSession(
      'live',
      'https://orufy.com/login?redirect=CHAT_APP',
      'tushar@orufy.com',
      'Orufy@123',
      'Orufy Live Testing'
    )
  ]);
  console.log('✅ Success.');
})();
