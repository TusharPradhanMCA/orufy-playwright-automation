const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({
    headless: false,
    args: ['--start-maximized']
  });

  const context = await browser.newContext({
    storageState: path.resolve(__dirname, "../json's/Linkedin-session.json"),
    viewport: null
  });

  const page = await context.newPage();

  await page.goto(
    'https://www.linkedin.com/jobs/collections/easy-apply/?currentJobId=4256667171&discover=recommended&discoveryOrigin=JOBS_HOME_JYMBII',
    { waitUntil: 'domcontentloaded', timeout: 60000 }
  );

  // Click "Easy Apply"
  await page.waitForSelector('button:has-text("Easy Apply")', { timeout: 10000 });
  await page.click('button:has-text("Easy Apply")');
  console.log('✅ Easy Apply button clicked.');

  // Fill Location
  const locationInputSelector = 'input[id^="single-typeahead-entity-form-component-formElement"][id*="location-GEO-LOCATION"]';
  await page.waitForSelector(locationInputSelector);
  const locationInput = await page.$(locationInputSelector);
  await locationInput.scrollIntoViewIfNeeded();
  await locationInput.fill('Jaipur');

  const dropdownOptionSelector = 'div.search-typeahead-v2__hit--autocomplete span.t-bold:has-text("Jaipur, Rajasthan, India")';
  await page.waitForSelector(dropdownOptionSelector, { timeout: 10000 });
  await page.click(dropdownOptionSelector);
  console.log('✅ Location selected.');

  // Click "Next" buttons until form proceeds
  for (let i = 0; i < 3; i++) {
    const nextBtn = await page.$('button:has-text("Next")');
    if (nextBtn) {
      await nextBtn.click();
      console.log(`✅ Clicked Next - Step ${i + 1}`);
      await page.waitForTimeout(1000); // wait between steps
    }
  }

  // Select Years and Months of Experience
  const dropdowns = await page.$$('select[id*="multipleChoice"]');
  if (dropdowns.length >= 2) {
    await dropdowns[0].selectOption({ label: '0 year' });
    console.log('✅ Selected "0 year".');

    await dropdowns[1].selectOption({ label: '5 months' });
    console.log('✅ Selected "5 months".');
  } else {
    console.error('❌ Dropdowns not found.');
  }
  // Click on the "Review" button
  const reviewButtonSelector = 'button:has-text("Review")';
  await page.waitForSelector(reviewButtonSelector, { timeout: 10000 });
  await page.click(reviewButtonSelector);
  console.log('✅ Clicked "Review" button.');

  const submitButtonSelector = 'button:has-text("Submit application")';
  await page.waitForSelector(submitButtonSelector, { timeout: 10000 });

  const submitButton = await page.$(submitButtonSelector);
  await submitButton.scrollIntoViewIfNeeded();
  await submitButton.click();
  console.log('✅ Application submitted successfully.');



  browser.on('disconnected', () => {
    console.log('✅ Browser closed. Exiting script.');
    process.exit(0);
  });


})();
