const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({
    headless: false,
    args: ['--start-maximized']
  });

  const context = await browser.newContext({
    storageState: path.resolve(__dirname, '../json\'s/orufy-session.json'),
    viewport: null
  });

  const page = await context.newPage();
  await page.goto('https://orufy.com');

  const links = page.locator('a[href="https://orufy.com/connect"]');
  const count = await links.count();

  for (let i = 0; i < count; i++) {
    const link = links.nth(i);
    const text = await link.innerText();

    if (text.trim().toLowerCase().includes('connect')) {
      await link.scrollIntoViewIfNeeded();
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'load' }),
        link.click()
      ]);
      break;
    }
  }

  await page.getByRole('button', { name: 'Access Orufy Connect' }).first().click();
  await page.waitForLoadState('load');

  await page.waitForSelector('text=Orufy Live Testings', { timeout: 10000 });
  await page.click('text=Orufy Live Testings');

  await page.waitForTimeout(3000);

  // Save screenshot in the screenshots folder
  await page.screenshot({ path: path.resolve(__dirname, '../screenshots/session-used.png') });

  await page.waitForTimeout(3000);
  await browser.close();
})();
