const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({
    headless: false,
    args: ['--start-maximized']
  });

  const context = await browser.newContext({
    storageState: path.resolve(__dirname, '../json\'s/beta-orufy-session.json'),
    viewport: null
  });

  const page = await context.newPage();
  await page.goto('https://connect.beta.orufy.in/contacts', { waitUntil: 'networkidle' });

  while (true) {
    const groupMenus = page.locator('svg[viewBox="0 0 20 20"]');
    const groupCount = await groupMenus.count();

    if (groupCount === 0) {
      console.log('✅ All contact groups deleted.');
      break;
    }

    const menuIcon = groupMenus.first();
    await menuIcon.scrollIntoViewIfNeeded();
    await menuIcon.click();

    const deleteBtn = page.locator('button:has-text("Delete")');
    await deleteBtn.click({ timeout: 2000 });

    const yesBtn = page.locator('button:has-text("Delete")');
    await yesBtn.click({ timeout: 2000 });

    console.log('🗑️ Deleted one group.');
    await page.waitForTimeout(500);
  }

  await browser.close();
})(); 
