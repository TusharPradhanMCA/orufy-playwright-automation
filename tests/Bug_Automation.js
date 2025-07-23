// Import required libraries
const { chromium } = require('playwright'); // For browser automation
const path = require('path'); // For resolving paths
const OpenAI = require('openai'); // For interacting with OpenAI API

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: 'API-KEY' // 🔐 Replace with a secure key
});

(async () => {
  const browser = await chromium.launch({
    headless: false,
    args: ['--start-maximized']
  });

  const context = await browser.newContext({
    storageState: path.resolve(__dirname, '../json\'s/live-orufy-session.json'),
    viewport: null
  });

  const page = await context.newPage();
  await page.goto('https://projects.orufy.com/projects/66bc8ff142fe26447efb4b4f/board', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  await page.getByRole('button', { name: 'Add Issue' }).click();
  await page.waitForSelector('div[role="dialog"]', { state: 'visible' });

  const dialog = page.locator('div[role="dialog"]');

  const issueTypeDropdown = dialog.locator('button[role="combobox"]').filter({ hasText: 'Task' });
  await issueTypeDropdown.click();
  await page.locator('div[role="option"]', { hasText: 'Bug' }).click();

  const assigneeTrigger = dialog.locator('div[aria-haspopup="dialog"]').first();
  await assigneeTrigger.click();
  const assigneeInput = dialog.locator('input[placeholder="Search"]');
  await assigneeInput.fill('manan');
  await assigneeInput.press('Enter');
  await page.mouse.click(50, 50);

  const selectOption = async (label, value) => {
    const combo = dialog.locator('button[role="combobox"]', { hasText: label });
    await combo.click();
    const option = page.locator('div[role="option"]', { hasText: value });
    await option.scrollIntoViewIfNeeded();
    await option.click();
  };

  await selectOption('Select Product Type', 'Connect');
  await selectOption('Env', 'beta');

  const titleInput = page.locator('input[placeholder="Enter issue title..."]');
  await titleInput.focus();

  console.log('📝 Waiting for user to enter title (press Enter to generate)...');

  let lastTitle = '';

  while (true) {
    const typedTitle = (await page.evaluate(() => {
      return new Promise((resolve) => {
        const input = document.querySelector('input[placeholder="Enter issue title..."]');
        const handler = (e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            input.removeEventListener('keydown', handler);
            resolve(input.value.trim());
          }
        };
        input.addEventListener('keydown', handler);
      });
    })).trim();

    if (!typedTitle || typedTitle.length < 3 || typedTitle === lastTitle) {
      console.log('⚠️ Invalid or duplicate title, waiting again...');
      continue;
    }

    lastTitle = typedTitle;
    console.log('🆕 New Title Entered:', typedTitle);

    const descEditor = page.locator('[contenteditable="true"]');
    await descEditor.scrollIntoViewIfNeeded();

    let imageUrl = '';
    const imageLocator = descEditor.locator('img');
    if (await imageLocator.count() > 0) {
      imageUrl = await imageLocator.first().getAttribute('src');
      console.log(`🖼️ Found image URL: ${imageUrl}`);
    }

    const userPrompt = `
Write or update a bug issue title, detailed description, and steps to reproduce.
Do not include any image links or screenshot references in the output.
Do not use bold formatting for headings or labels.

Issue Summary: ${typedTitle}
${imageUrl ? `Screenshot Reference (do not include in response): ${imageUrl}` : ''}
    `.trim();

    let aiResponse = '';

    try {
      const chatCompletion = await openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: 'You are a helpful QA assistant. Based on the issue summary and optional screenshot, generate a clear bug issue title, a detailed description, and precise steps to reproduce. Output in markdown format.'
          },
          {
            role: 'user',
            content: `Issue Summary: Email in new ticket updates contact of previous ticket\nScreenshot URL: https://cdn.orufy.com/email-bug.png`
          },
          {
            role: 'assistant',
            content: `**Issue Title:** Email in New Ticket Modifies Old Ticket Contact Details\n\n**Description:**\nWhen a user creates a second ticket with a new email address...`
          },
          {
            role: 'user',
            content: `Issue Summary: Clear all in filters doesn't reset filters`
          },
          {
            role: 'assistant',
            content: `**Issue Title:** Clear All Button in Filters Fails to Reset All Selections\n\n**Description:**\nClicking the "Clear all" button...`
          },
          {
            role: 'user',
            content: `Issue Summary: Create Ticket redirects to previous ticket instead of opening form`
          },
          {
            role: 'assistant',
            content: `**Issue Title:** Create Ticket Button Redirects to Previously Created Ticket\n\n**Description:**\nAfter submitting a ticket...`
          },
          {
            role: 'user',
            content: userPrompt
          }
        ]
      });

      aiResponse = chatCompletion.choices?.[0]?.message?.content || '';
    } catch (err) {
      console.error('❌ GPT API Error:', err.message);
      continue;
    }

    if (!aiResponse.trim()) {
      console.log('⚠️ Empty GPT response. Skipping...');
      continue;
    }

    const lines = aiResponse.split('\n');
    const generatedTitle = lines[0]
      .replace(/^#+\s*/, '')
      .replace(/\*\*/g, '')
      .replace(/^Bug Issue Title:?\s*/i, '')
      .replace(/^Issue Title:?\s*/i, '')
      .trim() || typedTitle;

    const descriptionStart = lines.findIndex(line => line.toLowerCase().includes('description:'));
    const description = descriptionStart >= 0
      ? lines.slice(descriptionStart).join('\n').trim()
      : aiResponse;

    await titleInput.fill(generatedTitle);
    await descEditor.click();
    await descEditor.fill('');

    const descriptionHTML = `
      <div>
        <p>${description.replace(/\n/g, '<br>')}</p>
        ${imageUrl ? `<img src="${imageUrl}" style="max-width: 100%; margin-top: 10px; border-radius: 6px;" />` : ''}
      </div>
    `;

    await descEditor.evaluate((el, html) => {
      el.innerHTML = html;
    }, descriptionHTML);

    console.log('✅ Issue updated with GPT suggestion.');
    console.log('🔁 Press Enter on title again to regenerate...');
  }
})();
