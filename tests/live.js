const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({
    headless: false,
    args: ['--start-maximized']
  });

  const context = await browser.newContext({
    storageState: path.join(__dirname, '../json\'s/orufy-session.json'),
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
  await page.screenshot({ path: path.join(__dirname, '../screenshots/session-used.png') });

  const channelsIcon = page.locator('p:text("Channels")');
  await channelsIcon.hover();
  await page.waitForTimeout(1000);

  await page.waitForSelector('text=Web Widget', { timeout: 10000 });
  await page.click('text=Web Widget');

  await page.waitForTimeout(3000);
  await page.screenshot({ path: path.join(__dirname, '../screenshots/web-widget-opened.png') });

  const widgetCards = page.locator('div.flex.border.bg-white');
  const widgetCount = await widgetCards.count();

  let newTab = null;
  let extractedChatId = null;

  for (let i = 0; i < widgetCount; i++) {
    const card = widgetCards.nth(i);
    const title = await card.locator('p').first().textContent();
    if (title && title.trim().toLowerCase() === 'default') {
      const embedButton = card.locator('button:has-text("Embed Code")');
      await embedButton.waitFor({ state: 'visible', timeout: 5000 });
      await embedButton.click();

      const embedPre = page.locator('pre');
      await embedPre.waitFor({ state: 'visible', timeout: 10000 });
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
            }
          } catch (e) {}
        }
      });

      await newTab.goto('https://test-prechat.vercel.app/');
      await newTab.waitForLoadState('domcontentloaded');

      const textarea = newTab.locator('textarea[placeholder*="Enter text to execute"]');
      await textarea.waitFor({ state: 'visible', timeout: 5000 });
      await textarea.fill(decodedEmbed);

      const executeBtn = newTab.locator('button', { hasText: 'Execute' });
      await executeBtn.click();

      await newTab.waitForTimeout(5000);
      break;
    }
  }

 if (newTab) {
    const iframe = newTab.frameLocator('iframe[src*="widget.connect.orufy.com"]');

    const chatIcon = iframe.locator('button[class*="_widget-icon_"]');
    await chatIcon.waitFor({ state: 'visible', timeout: 10000 });
    await chatIcon.click();
    await newTab.waitForTimeout(2000);

    const sendSection = iframe.locator('div.mb-6.flex.cursor-pointer');
    if (await sendSection.count()) {
      await sendSection.first().click();
      await newTab.waitForTimeout(2000);
    }

    const fullNameField = iframe.locator('input[placeholder="Enter Full Name"]');
    if (await fullNameField.isVisible({ timeout: 3000 })) {
      await fullNameField.scrollIntoViewIfNeeded();
      await fullNameField.click();
      await fullNameField.fill('John Doe');

      const emailField = iframe.locator('input[placeholder="Enter Email"]');
      await emailField.scrollIntoViewIfNeeded();
      await emailField.click();
      await emailField.fill('john.doe@test.com');

      const phoneField = iframe.locator('input[type="tel"]');
      await phoneField.scrollIntoViewIfNeeded();
      await phoneField.click();
      await phoneField.press('Control+A');
      await phoneField.press('Backspace');
      await phoneField.type('+919876543210');

      const messageField = iframe.locator('textarea[placeholder="Enter Message"]');
      await messageField.scrollIntoViewIfNeeded();
      await messageField.click();
      await messageField.fill('This is a dummy pre-chat message.');

      const submitBtn = iframe.locator('p:has-text("Submit")');
      await submitBtn.scrollIntoViewIfNeeded();
      await submitBtn.click();

      await newTab.waitForTimeout(3000);
    }

    const messageBox = iframe.locator('textarea[placeholder="Write your message..."]');
    await messageBox.waitFor({ state: 'visible', timeout: 10000 });
    await messageBox.fill('Hello, this is an automated message!');
    await newTab.keyboard.press('Enter');

    await newTab.waitForTimeout(5000);

    if (extractedChatId) {
      const adminUrl = `https://connect.orufy.com/chats/with?chatId=${extractedChatId}&filterId=OPEN`;
      const adminTab = await context.newPage();
      await adminTab.goto(adminUrl);
      await adminTab.waitForLoadState('domcontentloaded');
    }

   await new Promise(() => {});
  }

 await newTab.close();
})();
