const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

(async () => {
  const sessionPath = path.join(__dirname, '../json\'s/gmail-session.json');

  const browser = await chromium.launch({
    headless: false, // so you can log in manually
    args: ['--start-maximized']
  });

  const context = await browser.newContext({
    viewport: null
  });

  const page = await context.newPage();
  await page.goto('https://mail.google.com');

  console.log("🔓 Please log in to your Gmail account manually...");
  await page.waitForTimeout(15000); // wait for 60 seconds or more if needed

  // Save the session after manual login
  await context.storageState({ path: sessionPath });
  console.log(`✅ Gmail session saved at ${sessionPath}`);

  await browser.close();
})();
