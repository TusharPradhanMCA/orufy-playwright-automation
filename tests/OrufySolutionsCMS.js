const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({
    headless: false,
    args: ['--start-maximized']
  });

  const context = await browser.newContext({
    storageState: path.resolve(__dirname, '../json\'s/cms-orufy-session.json'),
    viewport: null
  });

  const page = await context.newPage();

  await page.goto('https://betacms.orufy.in/admin/content-manager/collectionType/api::solutions-service.solutions-service/9', {
    waitUntil: 'networkidle'
  });

  console.log('✅ CMS page loaded using saved session');
    await page.waitForTimeout(3000);


  // Wait and click "Add a component to page"
  const addComponentButton = page.locator('button:has-text("Add a component to page")');

  await addComponentButton.waitFor({
    state: 'visible',
    timeout: 10000
  });

  await addComponentButton.scrollIntoViewIfNeeded();
  await addComponentButton.click();
  

  console.log('✅ Clicked "Add a component to page" button');

 
    const serviceHeroButton = page.locator('button:has-text("serviceHero")');

     await serviceHeroButton.waitFor({ state: 'visible', timeout: 10000 });
      await serviceHeroButton.scrollIntoViewIfNeeded();
     await serviceHeroButton.click();

     console.log('✅ Clicked the "serviceHero" button');

 browser.on('disconnected', () => {
    console.log('✅ Browser closed. Exiting script.');
    process.exit(0);
  });             
})();
