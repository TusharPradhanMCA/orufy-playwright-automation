const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const { getOtpFromGmail } = require('../scripts/gmailOtp');

// 🔀 Random name generator
const randomFrom = (arr) => arr[Math.floor(Math.random() * arr.length)];

const firstNames = ['Mohit', 'Ankit', 'Prerna', 'Neha', 'Saurav', 'Divya', 'Manan', 'Priya', 'Amit'];
const lastNames = ['Jangid', 'Verma', 'Patel', 'Kumar', 'Gupta', 'Joshi', 'Biyani', 'Jain', 'Rathore'];

(async () => {
  const browser = await chromium.launch({
    headless: false,
    args: ['--start-maximized']
  });

  const gmailSessionPath = path.join(__dirname, '../json\'s/gmail-session.json');
  const context = await browser.newContext({
    storageState: gmailSessionPath,
    viewport: null
  });

  const page = await context.newPage();
  await page.goto('https://beta.orufy.in/register?redirect=CHAT_APP');  // https://orufy.com/register?redirect=CHAT_APP

  const uniqueId = Date.now();
  const email = `tushar+${uniqueId}@orufy.com`;

  const firstName = randomFrom(firstNames);
  const lastName = randomFrom(lastNames);

  try {
    await page.fill('input[name="firstName"]', firstName);
    await page.fill('input[name="lastName"]', lastName);
    await page.fill('input[name="companyName"]', 'Orufy Live Testing');
    await page.fill('input[name="emailId"]', email);
    await page.fill('input[name="password"]', 'Orufy@123');
    await page.fill('input[name="mobileNo"]', '9999999999');
    await page.click('button[type="submit"]');

    console.log(`✅ Registration form submitted for: ${email}`);
    await page.waitForSelector('input[maxlength="1"]', { timeout: 10000 });
  } catch (e) {
    console.error("❌ Form submission failed or OTP field not visible.");
    await browser.close();
    return;
  }

  let otp;
  try {
    console.log("⏳ Fetching OTP via Gmail API...");
    otp = await getOtpFromGmail();
  } catch (err) {
    console.error(err);
    await browser.close();
    return;
  }

  try {
    const otpInputs = page.locator('input[maxlength="1"]');
    for (let i = 0; i < otp.length; i++) {
      await otpInputs.nth(i).fill(otp[i]);
    }

    const verifyButton = page.locator('button[aria-label="verify otp"]');
    await verifyButton.waitFor({ state: 'visible', timeout: 5000 });
    await verifyButton.click();

    console.log("🎉 OTP submitted and verified!");
  } catch {
    console.error("❌ Could not enter OTP or click verify.");
  }
  

  // 📦 Save to session
  const storagePath = path.join(__dirname, '../json\'s/store-gmail-session.json');
  const newRecord = {
    email: email,
    firstName: firstName,
    lastName: lastName,
    createdAt: new Date().toISOString()
  };

  try {
    let data = [];
    if (fs.existsSync(storagePath)) {
      const existing = fs.readFileSync(storagePath, 'utf-8');
      data = existing ? JSON.parse(existing) : [];
    }
    data.push(newRecord);
    fs.writeFileSync(storagePath, JSON.stringify(data, null, 2));
    console.log("📦 Email stored in store-gmail-session.json");
  } catch (err) {
    console.error("❌ Failed to store email:", err.message);
  }

  await new Promise(() => {});
})();
