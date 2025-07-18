const { chromium } = require('playwright');
const path = require('path');

const runImport = async (envName, baseUrl, sessionFile) => {
  const browser = await chromium.launch({ headless: false, args: ['--start-maximized'] });
  const context = await browser.newContext({
    storageState: path.resolve(__dirname, sessionFile),
    viewport: null
  });

  const page = await context.newPage();
  await page.goto(`${baseUrl}/dashboard`);
  await page.getByText('Contacts').hover();
  await page.waitForSelector('text=Groups', { timeout: 10000 });
  await page.click('text=Groups');
  await page.locator('button:has-text("Create Group")').click();

  let success = false, attempt = 0, uniqueName = '';
  while (attempt < 5 && !success) {
    uniqueName = `AutoGroup-${Date.now()}-${attempt}`;
    const input = page.locator('input[placeholder="Enter Group name"]');
    await input.waitFor({ state: 'visible', timeout: 5000 });
    await input.fill(uniqueName);
    await page.locator('button:has-text("Save")').click();
    try {
      await page.waitForSelector(`text=${uniqueName}`, { timeout: 5000 });
      success = true;
    } catch { attempt++; }
  }

  const groupRow = page.locator(`tr:has-text("${uniqueName}")`);
  await groupRow.first().click();
  await page.locator('button:has-text("Import")').click();

  await page.locator('input[type="file"]').setInputFiles(
    path.resolve(__dirname, '../data/199Contacts.csv')
  );

  await page.locator('button:has-text("Next")').click();
  await page.waitForSelector('text=Match fields', { timeout: 10000 });

  const fieldTypeElements = await page.locator('.grid .py-2').all();
  const normalize = str => str?.trim().toLowerCase().replace(/[^a-z0-9]/gi, '');
  let mappingRequired = false;

  for (let i = 0; i < fieldTypeElements.length; i += 3) {
    const labelElement = fieldTypeElements[i];
    const dropdownContainer = fieldTypeElements[i + 2];

    const fieldTypeRaw = await labelElement.innerText();
    const fieldType = normalize(fieldTypeRaw);

    const selected = await dropdownContainer
      .locator('.css-1dimb5e-singleValue, .css-1jqq78o-placeholder')
      .innerText()
      .catch(() => '');

    if (selected.toLowerCase() !== 'select...') continue;

    mappingRequired = true;
    await dropdownContainer.scrollIntoViewIfNeeded();
    await dropdownContainer.click();
    await page.waitForSelector('div[id^="react-select"] div[role="option"]', { timeout: 5000 });

    const options = page.locator('div[id^="react-select"] div[role="option"]');
    const count = await options.count();
    let matched = false;

    for (let j = 0; j < count; j++) {
      const option = options.nth(j);
      const optionText = normalize(await option.innerText());

      if (optionText === fieldType) {
        await option.scrollIntoViewIfNeeded();
        await option.click({ force: true });
        matched = true;
        break;
      }
    }

    if (!matched) {
      for (let j = 0; j < count; j++) {
        const option = options.nth(j);
        const text = (await option.innerText()).toLowerCase();
        if (text.includes('do not map')) {
          await option.scrollIntoViewIfNeeded();
          await option.click({ force: true });
          console.log(`[${envName}] Fallback to "Do not map" for: ${fieldTypeRaw}`);
          break;
        }
      }
    }
  }

  if (mappingRequired) {
    await page.locator('button:has-text("Next")').click();
  }

  console.log(`✅ Completed on ${envName}`);

};

(async () => {
  await Promise.all([
    runImport('beta', 'https://connect.beta.orufy.in', '../json\'s/beta-orufy-session.json'),
    runImport('staging', 'https://connect.staging.orufy.in', '../json\'s/staging-orufy-session.json'),
    runImport('live', 'https://connect.orufy.com', '../json\'s/live-orufy-session.json')
  ]);
   await new Promise(() => {});
})();
