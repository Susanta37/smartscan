import { chromium } from '@playwright/test';
import fs from 'node:fs/promises';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
page.on('pageerror', (error) => console.log('PAGE ERROR', error.message));
await page.goto('http://localhost:8000');
await page.getByRole('heading', { name: 'Good work starts here.' }).waitFor();
await fs.mkdir('test-results', { recursive: true });
await page.screenshot({ path: 'test-results/dashboard.png', fullPage: true });
console.log('TITLE', await page.title());
console.log(
    'OVERFLOW',
    await page.evaluate(() => ({
        scroll: document.documentElement.scrollWidth,
        width: innerWidth,
    })),
);
await browser.close();
