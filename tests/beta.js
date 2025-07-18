const { chromium } = require('playwright');
const path = require('path');

async function run(index) {
  const browser = await chromium.launch({
    headless: false,
    args: ['--start-maximized']
  });

  const context = await browser.newContext({
    storageState: path.join(__dirname, '../json\'s/beta-orufy-session.json'),
    viewport: null
  });

  const page = await context.newPage();
  console.log(`\n🔁 [${index}] Navigating to beta.orufy.in`);
  await page.goto('https://beta.orufy.in');

  const links = page.locator('a[href="https://beta.orufy.in/connect"]');
  const count = await links.count();

  for (let i = 0; i < count; i++) {
    const link = links.nth(i);
    const text = await link.innerText();
    if (text.trim().toLowerCase().includes('connect')) {
      console.log('✅ Found "Connect" link. Clicking...');
      await link.scrollIntoViewIfNeeded();
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'domcontentloaded' }),
        link.click()
      ]);
      break;
    }
  }

  console.log('✅ Launching Orufy Connect');
  const [companyTab] = await Promise.all([
    context.waitForEvent('page'),
    page.getByRole('button', { name: 'Access Orufy Connect' }).first().click()
  ]);

  await companyTab.waitForLoadState('domcontentloaded');
  await companyTab.locator('button:has-text("tushar cop")').first().click();
  await companyTab.waitForTimeout(1000);
  await companyTab.getByText('Channels').click();
  await companyTab.waitForTimeout(500);
  await companyTab.click('text=Web Widget');
  await companyTab.waitForTimeout(1000);

  console.log('✅ Looking for default Web Widget card...');
  const widgetCards = companyTab.locator('div.flex.border.bg-white');
  const widgetCount = await widgetCards.count();

  let newTab = null;
  let extractedChatId = null;

  for (let i = 0; i < widgetCount; i++) {
    const card = widgetCards.nth(i);
    const title = await card.locator('p').first().textContent();
    if (title && title.trim().toLowerCase() === 'default') {
      console.log('✅ Found default widget. Opening Embed Code...');
      const embedButton = card.locator('button:has-text("Embed Code")');
      await embedButton.click();

      const embedPre = companyTab.locator('pre');
      await embedPre.waitFor({ state: 'visible', timeout: 5000 });

      const rawEmbed = await embedPre.innerText();
      const decodedEmbed = rawEmbed
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
        .trim();

      newTab = await context.newPage();

      newTab.on('response', async (response) => {
        const url = response.url();
        if (url.includes('/send') && response.request().method() === 'POST') {
          try {
            const json = await response.json();
            if (json?.data?.chatId) {
              extractedChatId = json.data.chatId;
              console.log(`✅ Chat ID received: ${extractedChatId}`);
            }
          } catch (e) {}
        }
      });

      console.log('✅ Opening pre-chat tester and injecting embed...');
      await newTab.goto('https://test-prechat.vercel.app/');
      await newTab.waitForLoadState('domcontentloaded');

      const textarea = newTab.locator('textarea[placeholder*="Enter text to execute"]');
      await textarea.fill(decodedEmbed);

      const executeBtn = newTab.locator('button', { hasText: 'Execute' });
      await executeBtn.click();

      break;
    }
  }

  await newTab.waitForTimeout(1500);
  if (newTab) {
    console.log('✅ Launching widget...');
    const iframe = newTab.frameLocator('iframe[src*="widget.connect.beta.orufy.in"]');

    try {
      const widgetIcon = iframe.locator('button[class*="_widget-icon_"]');
      await widgetIcon.waitFor({ state: 'visible', timeout: 5000 });
      await newTab.waitForTimeout(1000);
      await widgetIcon.click();
      console.log('✅ Widget icon clicked');
      await newTab.waitForTimeout(1500);
    } catch (err) {
      console.warn('⚠️ Widget icon not found or not clickable:', err);
    }

    const chatsIcon = iframe.locator('button:has(span:text("Chats"))');
    try {
      await chatsIcon.waitFor({ state: 'visible', timeout: 5000 });
      await chatsIcon.scrollIntoViewIfNeeded();
      await chatsIcon.click();
      console.log('✅ Chats icon clicked inside widget');
      await newTab.waitForTimeout(1000);
    } catch (e) {
      console.warn('⚠️ Chats icon not found or not clickable:', e);
    }

    try {
      const vectorIcon = iframe.locator('div.inline-block.bg-current.h-5.w-5');
      await vectorIcon.waitFor({ state: 'visible', timeout: 5000 });
      const clickableParent = vectorIcon.locator('..');
      await clickableParent.click();
      console.log('✅ Vector masked icon clicked');
      await newTab.waitForTimeout(1000);
    } catch (e) {
      console.warn('⚠️ Vector icon button not found or not clickable:', e);
    }

    let widgetReady = false;
    for (let i = 0; i < 10; i++) {
      const msgBox = iframe.locator('textarea[placeholder="Write your message..."]');
      const nameInput = iframe.locator('input[placeholder="Enter Full Name"]');
      if (
        await msgBox.isVisible().catch(() => false) ||
        await nameInput.isVisible().catch(() => false)
      ) {
        widgetReady = true;
        break;
      }
      await newTab.waitForTimeout(500);
    }

    if (!widgetReady) {
      throw new Error('❌ Widget did not load message box or pre-chat form.');
    }

    const timestamp = Date.now();
    const name = `John${timestamp}`;
    const email = `john${timestamp}@test.com`;
    const phone = `+9198${timestamp.toString().slice(-8)}`;

    const fullNameField = iframe.locator('input[placeholder="Enter Full Name"]');
    if (await fullNameField.isVisible({ timeout: 3000 }).catch(() => false)) {
      console.log('✅ Filling pre-chat form...');
      await fullNameField.fill(name);
      await iframe.locator('input[placeholder="Enter Email"]').fill(email);

      const phoneField = iframe.locator('input[name="phoneNumber"]');
      await phoneField.press('Control+A');
      await phoneField.press('Backspace');
      await phoneField.type(phone);

      await iframe.locator('textarea[placeholder="Enter Message"]').fill('This is a dummy pre-chat message.');
      await iframe.locator('p:has-text("Submit")').click();
      await newTab.waitForTimeout(1500);
    }

    const messageBox = iframe.locator('textarea[placeholder="Write your message..."]');
    await messageBox.waitFor({ state: 'visible', timeout: 10000 });
    await messageBox.fill('Hello, this is an automated message!');
    await newTab.keyboard.press('Enter');
    await newTab.waitForTimeout(3000);

    if (extractedChatId) {
      const adminUrl = `https://connect.beta.orufy.in/chats/with?chatId=${extractedChatId}&filterId=OPEN`;
      console.log(`✅ Opening chat in admin panel: ${adminUrl}`);
      const adminTab = await context.newPage();
      await adminTab.goto(adminUrl);
      await adminTab.waitForLoadState('domcontentloaded');
    }
  }

  await browser.close();
  console.log(`✅ Finished run [${index}]. Restarting...\n`);
}

(async () => {
  let i = 0;
  while (true) {
    try {
      await run(i++);
    } catch (err) {
      console.error(`❌ Error in run [${i}]:`, err);
    }
  }
})();
