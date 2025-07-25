const { chromium } = require('playwright');
const path = require('path');

async function run(index) {
  const browser = await chromium.launch({ headless: false, args: ['--start-maximized'] });
  const context = await browser.newContext({
    storageState: path.join(__dirname, '../json\'s/beta-orufy-session.json'),
    viewport: null
  });

  const page = await context.newPage();
  console.log(`\n🔁 Navigating to beta.orufy.in`);
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
      const decodedEmbed = rawEmbed.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').trim();

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
          } catch (e) { }
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
      await widgetIcon.click();
      console.log('✅ Widget icon clicked');
      await newTab.waitForTimeout(1500);
    } catch (err) {
      console.warn('⚠️ Widget icon not found or not clickable:', err);
    }

    const chatsBtn = iframe.locator('button:has(span:text("Chats"))');
    const vectorIcon = iframe.locator('div.inline-block.bg-current.h-5.w-5');
    const messageBox = iframe.locator('textarea[placeholder="Write your message..."]');
    const preChatName = iframe.locator('input[placeholder="Enter Full Name"]');

    let isPreChatVisible = false;
    let isChatBoxVisible = false;

    try { isPreChatVisible = await preChatName.isVisible({ timeout: 3000 }); } catch { }
    try { isChatBoxVisible = await messageBox.isVisible({ timeout: 3000 }); } catch { }

    if (isPreChatVisible || isChatBoxVisible) {
      // Dynamically fill the pre-chat form if present
      const timestamp = Date.now();
      const name = `John${timestamp}`;
      const email = `john${timestamp}@test.com`;
      const phone = `+9198${timestamp.toString().slice(-8)}`;

      if (isPreChatVisible) {
        console.log('✅ Pre-chat detected — filling visible fields...');
        if (await preChatName.isVisible().catch(() => false)) await preChatName.fill(name);

        const emailField = iframe.locator('input[placeholder="Enter Email"]');
        if (await emailField.isVisible().catch(() => false)) await emailField.fill(email);

        const phoneField = iframe.locator('input[name="phoneNumber"]');
        if (await phoneField.isVisible().catch(() => false)) {
          await phoneField.press('Control+A');
          await phoneField.press('Backspace');
          await phoneField.type(phone);
        }

        const messageField = iframe.locator('textarea[placeholder="Enter Message"]');
        if (await messageField.isVisible().catch(() => false)) {
          await messageField.fill('This is a dummy pre-chat message.');
        }

        const submitBtn = iframe.locator('p:has-text("Submit")');
        await submitBtn.click();
        console.log('✅ Pre-chat form submitted');

        await messageBox.waitFor({ state: 'visible', timeout: 10000 });
        await messageBox.fill('Hello, this is an automated message!');
        await newTab.keyboard.press('Enter');
        await newTab.waitForTimeout(2000);
        console.log('✅ Message sent after pre-chat');

      } else {
        console.log('✅ Chat box directly visible — sending message...');
        await messageBox.fill('Hello, this is an automated message!');
        await newTab.keyboard.press('Enter');
        await newTab.waitForTimeout(2000);
        console.log('✅ Message sent directly');
      }

    } else {
      let isChatsVisible = false;
      try { isChatsVisible = await chatsBtn.isVisible({ timeout: 3000 }); } catch { }

      if (isChatsVisible) {
        console.log('✅ Chats button found — clicking...');
        await chatsBtn.click();
        await newTab.waitForTimeout(1000);

        try {
          await vectorIcon.waitFor({ state: 'visible', timeout: 3000 });
          const clickableParent = vectorIcon.locator('..');
          await clickableParent.click();
          console.log('✅ Vector icon clicked');
          await newTab.waitForTimeout(1000);
        } catch (e) {
          console.warn('⚠️ Vector icon not found:', e);
        }

        try { isPreChatVisible = await preChatName.isVisible({ timeout: 3000 }); } catch { }
        try { isChatBoxVisible = await messageBox.isVisible({ timeout: 3000 }); } catch { }

        if (isPreChatVisible || isChatBoxVisible) {
          const timestamp = Date.now();
          const name = `John${timestamp}`;
          const email = `john${timestamp}@test.com`;
          const phone = `+9198${timestamp.toString().slice(-8)}`;

          if (isPreChatVisible) {
            console.log('✅ Pre-chat appeared after chats — filling visible fields...');
            if (await preChatName.isVisible().catch(() => false)) await preChatName.fill(name);

            const emailField = iframe.locator('input[placeholder="Enter Email"]');
            if (await emailField.isVisible().catch(() => false)) await emailField.fill(email);

            const phoneField = iframe.locator('input[name="phoneNumber"]');
            if (await phoneField.isVisible().catch(() => false)) {
              await phoneField.press('Control+A');
              await phoneField.press('Backspace');
              await phoneField.type(phone);
            }

            const messageField = iframe.locator('textarea[placeholder="Enter Message"]');
            if (await messageField.isVisible().catch(() => false)) {
              await messageField.fill('This is a dummy pre-chat message.');
            }

            const submitBtn = iframe.locator('p:has-text("Submit")');
            await submitBtn.click();
            console.log('✅ Pre-chat form submitted after chats');

            await messageBox.waitFor({ state: 'visible', timeout: 10000 });
            await messageBox.fill('Hello, this is an automated message!');
            await newTab.keyboard.press('Enter');
            await newTab.waitForTimeout(2000);
            console.log('✅ Message sent after fallback pre-chat');

          } else {
            console.log('✅ Message box appeared after chats — sending message...');
            await messageBox.fill('Hello, this is an automated message!');
            await newTab.keyboard.press('Enter');
            await newTab.waitForTimeout(2000);
            console.log('✅ Message sent after fallback');
          }

        } else {
          throw new Error('❌ No widget action succeeded after chats click.');
        }
      } else {
        throw new Error('❌ Neither pre-chat, message box, nor chats icon visible — cannot proceed.');
      }
    }

    if (extractedChatId) {
      const adminUrl = `https://connect.beta.orufy.in/chats/with?chatId=${extractedChatId}&filterId=OPEN`;
      console.log(`✅ Opening chat in admin panel: ${adminUrl}`);
      const adminTab = await context.newPage();
      await adminTab.goto(adminUrl);
      await adminTab.waitForLoadState('domcontentloaded');
    }
  }


  await new Promise(() => { });

}

run(0).catch(err => {
  console.error('❌ Script failed:', err);
});
