/**
 * Captures the CoteccApp web target at multiple viewports.
 *
 * Usage:
 *   1. cd CoteccApp && npm run web -- --port 8090
 *   2. cd tools/screenshots && npm install && npx playwright install chromium
 *   3. npm run capture
 *
 * Env vars: BASE_URL (default http://localhost:8090),
 *           OUT_DIR (default ../../doc/screenshots)
 */
const fs = require('fs');
const path = require('path');

const {chromium} = require('playwright');

const BASE_URL = process.env.BASE_URL || 'http://localhost:8090';
const OUT_DIR =
  process.env.OUT_DIR || path.join(__dirname, '..', '..', 'doc', 'screenshots');

const VIEWPORTS = [
  {name: 'mobile', width: 390, height: 844},
  {name: 'tablet', width: 768, height: 1024},
  {name: 'desktop', width: 1440, height: 900},
];

const capture = async (page, name, viewportName) => {
  const file = path.join(OUT_DIR, `${name}-${viewportName}.png`);
  await page.screenshot({path: file});
  console.log(`captured ${file}`);
};

(async () => {
  fs.mkdirSync(OUT_DIR, {recursive: true});
  const browser = await chromium.launch();

  for (const viewport of VIEWPORTS) {
    const page = await browser.newPage({
      viewport: {width: viewport.width, height: viewport.height},
    });

    await page.goto(BASE_URL, {waitUntil: 'networkidle'});
    await page.waitForSelector('text=Enter Your Name:', {timeout: 120000});
    await capture(page, 'game-selection', viewport.name);

    await page.fill('input', 'Mauro');
    await page.click('text=Start Game');
    await page.waitForSelector('text=Player name:', {timeout: 30000});
    await capture(page, 'game-screen', viewport.name);

    // the first img is the sticky header banner, the next ones are the hand
    await page.locator('img').nth(1).click();
    // let the AI opponents respond so the table shows a turn in progress
    await page.waitForTimeout(3500);
    await capture(page, 'game-turn', viewport.name);

    await page.close();
  }

  await browser.close();
})().catch(error => {
  console.error(error);
  process.exit(1);
});
