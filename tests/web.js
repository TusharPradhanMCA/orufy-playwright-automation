const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false, args: ['--start-maximized'] });
  const context = await browser.newContext({
    storageState: 'orufy-session.json',
    viewport: null
  });
  const page = await context.newPage();

  await page.goto('https://connect.orufy.com/dashboard');

  // Locate the Channels icon via its visible text "Channels"
  const channelsIcon = page.locator('p:text("Channels")');
  await channelsIcon.hover(); // Hover to trigger the menu
  await page.waitForTimeout(1000);

  // Wait for and click on "Web Widget"
  await page.waitForSelector('text=Web Widget', { timeout: 10000 });
  await page.click('text=Web Widget');

  await page.waitForTimeout(3000);
  await page.screenshot({ path: 'web-widget-opened.png' });
 
   // Wait to ensure all widget cards load
  await page.waitForTimeout(100);

  // Get all widget cards (each with class="flex ...")
  const widgetCards = page.locator('div.flex.border.bg-white');

  const count = await widgetCards.count();
  console.log(`Found ${count} widget cards`);

  for (let i = 0; i < count; i++) {
    const card = widgetCards.nth(i);
    const title = await card.locator('p').first().textContent();

    if (title && title.trim().toLowerCase() === 'default') {
      console.log(`Clicking Embed Code for widget: ${title}`);

      const embedButton = card.locator('button:has-text("Embed Code")');
      await embedButton.waitFor({ state: 'visible', timeout: 5000 });
      await embedButton.click();

      await page.waitForLoadState('networkidle');
      await page.waitForTimeout(3000);

      break; // Stop after opening the first matching widget
    }
  }

  // Extract embed code from <pre> tag inside the embed page
  const embedPre = page.locator('pre');
  await embedPre.waitFor({ state: 'visible', timeout: 5000 });
  const rawEmbed = await embedPre.innerText();

  // Decode HTML entities (e.g. &lt; to <)
  const decodedEmbed = rawEmbed
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .trim();

  // Open a new tab to the test page
  const newTab = await context.newPage();
  await newTab.goto('https://test-prechat.vercel.app/');
  await newTab.waitForLoadState('domcontentloaded');

  // Fill the textarea with decoded embed code
  const textarea = newTab.locator('textarea[placeholder*="Enter text to execute"]');
  await textarea.waitFor({ state: 'visible', timeout: 5000 });
  await textarea.fill(decodedEmbed);

  // Click the Execute button
  const executeBtn = newTab.locator('button', { hasText: 'Execute' });
  await executeBtn.click();

  await newTab.waitForTimeout(5000);



  await browser.close();
})();
