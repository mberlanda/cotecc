const {chromium} = require('playwright');

const targetUrl = process.env.WEB_URL || 'http://localhost:8080/';

async function main() {
  const browser = await chromium.launch({headless: true});
  const page = await browser.newPage({viewport: {width: 1280, height: 900}});
  const messages = [];

  page.on('console', message => {
    messages.push(`[${message.type()}] ${message.text()}`);
  });
  page.on('pageerror', error => {
    messages.push(`[pageerror] ${error.stack || error.message}`);
  });

  try {
    const response = await page.goto(targetUrl, {
      waitUntil: 'networkidle',
      timeout: 30000,
    });

    if (!response || !response.ok()) {
      throw new Error(`Expected a successful response, got ${response?.status()}`);
    }

    await page.getByText('Cotecc').first().waitFor({timeout: 10000});

    const renderState = await page.evaluate(() => {
      const root = document.getElementById('root');
      return {
        rootHtmlLength: root?.innerHTML.length || 0,
        rootText: root?.innerText.trim() || '',
      };
    });

    if (!renderState.rootHtmlLength || !renderState.rootText) {
      throw new Error(
        `Expected rendered app content, got rootHtmlLength=${renderState.rootHtmlLength}`,
      );
    }

    console.log(`Rendered ${targetUrl}: ${renderState.rootText.slice(0, 120)}`);
  } catch (error) {
    console.error(`Web render smoke test failed for ${targetUrl}`);
    if (messages.length) {
      console.error(messages.join('\n'));
    }
    throw error;
  } finally {
    await browser.close();
  }
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
