const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({
    headless: false,
    args: ['--start-maximized']
  });

  const context = await browser.newContext({
    storageState: path.join(__dirname, '../json\'s/combined-session.json'),
    viewport: null
  });

  const page = await context.newPage();
  console.log('✅ Navigating to beta.orufy.in');
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
      await widgetIcon.waitFor({ state: 'visible', timeout: 6000 });
      await widgetIcon.click();
      console.log('✅ Widget icon clicked');
    } catch (err) {
      console.warn('⚠️ Widget icon not found or not clickable:', err);
    }

    const chatsIcon = iframe.locator('button:has(span:text("Ticket"))');
    try {
      await chatsIcon.waitFor({ state: 'visible', timeout: 5000 });
      await chatsIcon.click();
      console.log('✅ Chats icon clicked inside widget');
    } catch (e) {
      console.warn('⚠️ Chats icon not found or not clickable:', e);
    }

    const createTicketBtn = iframe.getByRole('button', { name: /create ticket/i });
    await createTicketBtn.waitFor({ state: 'visible', timeout: 5000 });
    await createTicketBtn.click();
    console.log('✅ Clicked "Create ticket" button');

    await iframe.locator('input[placeholder="Enter your email"]').fill('tushar@orufy.com');
    await iframe.locator('input[placeholder="Enter Title"]').fill('Test Ticket from Automation');
    await iframe.locator('textarea[placeholder="Enter Description"]').fill('This ticket was created via Playwright automation.');

    const submitBtn = iframe.locator('button:has-text("Submit")');
    await submitBtn.waitFor({ state: 'visible', timeout: 5000 });
    await submitBtn.click();
    console.log('✅ Ticket form submitted');

    const ticketIdElement = iframe.locator('text=Ticket ID').locator('xpath=..').locator('text=#');
    await ticketIdElement.waitFor({ timeout: 5000 });
    const ticketIdRaw = await ticketIdElement.textContent();
    const ticketId = ticketIdRaw.replace('#', '').trim();
    console.log('🎫 Extracted Ticket ID:', ticketId);

    const adminTicketTab = await context.newPage();
    await adminTicketTab.goto(`https://connect.beta.orufy.in/tickets?ticketId=${ticketId}`);
    await adminTicketTab.waitForLoadState('domcontentloaded');
    console.log('✅ Opened admin panel with Ticket ID');

    // ✅ Change status from SUBMITTED to PROGRESS
    const submittedDropdown = adminTicketTab.locator('div.css-ihs86m-control:has-text("SUBMITTED")');
    await submittedDropdown.waitFor({ state: 'visible', timeout: 5000 });
    await submittedDropdown.click();
    console.log('🔽 Clicked dropdown with status SUBMITTED');

    const progressOption = adminTicketTab.locator('div[role="option"]', { hasText: 'PROGRESS' });
    await progressOption.waitFor({ state: 'visible', timeout: 3000 });
    await progressOption.click();
    console.log('✅ Changed status to PROGRESS');

    const saveButton = adminTicketTab.locator('button:has-text("Save")');
    await saveButton.waitFor({ state: 'visible', timeout: 3000 });
    await saveButton.click();
    console.log('✅ Clicked Save button');

    /* ✅ Open Gmail in same context
    const gmailTab = await context.newPage();
    console.log("📧 Navigating to Gmail...");
    await gmailTab.goto('https://mail.google.com/mail/u/0/#inbox', { waitUntil: 'domcontentloaded' });

    await gmailTab.waitForSelector('table[role="grid"] tbody tr', { timeout: 10000 });
    await gmailTab.locator('table[role="grid"] tbody tr').first().click();
    console.log('✅ Opened most recent Gmail email');

    await gmailTab.waitForTimeout(3000);
    const emailBody = await gmailTab.locator('div[dir="ltr"]').first().innerText();
    console.log('📨 Email body:\n', emailBody);

    const otpMatch = emailBody.match(/\b\d{6}\b/);
    if (otpMatch) {
      console.log('🔐 OTP Found:', otpMatch[0]);
    }
    */
  }

  browser.on('disconnected', () => {
    console.log('✅ Browser closed. Exiting script.');
    process.exit(0);
  });
})();
