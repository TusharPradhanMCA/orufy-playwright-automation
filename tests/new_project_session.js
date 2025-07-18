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

  const loginUrl = 'https://orufy.com/login?redirect=CHAT_APP';
  const email = 'tushar+12223@orufy.com';
  const password = 'Orufy@123';
  const businessName = 'Orufy Live Testing';

  // Navigate to login page
  await page.goto(loginUrl);

  // Enter credentials
  await page.fill('input[name="emailId"]', email);
  await page.fill('input[name="password"]', password);
  await page.click('button[aria-label="sign in"]');


  // Create JSON file for session
  const sessionPath = path.resolve(__dirname, "../json's/project-live-orufy-session.json");
  const sessionData = await context.storageState();

  // Ensure directory exists
  const dir = path.dirname(sessionPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  // Write session to JSON
  fs.writeFileSync(sessionPath, JSON.stringify(sessionData, null, 2));
  console.log('✅ New session file created at:', sessionPath);

  await browser.close();
};

loginAndCreateLiveSession();
