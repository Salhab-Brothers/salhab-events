// Draws public/og.png (1200x630), the picture WhatsApp shows when the link is shared.
// Run: node scripts/make-og-card.mjs   (needs the Playwright browser: npx playwright install chromium)
import { chromium } from '@playwright/test';
import { readFileSync, writeFileSync } from 'node:fs';
import { URL } from 'node:url';

// Embedded, because a page made with setContent cannot load files from disk.
const font = 'data:font/woff2;base64,' + readFileSync(new URL('../node_modules/@fontsource-variable/cairo/files/cairo-arabic-wght-normal.woff2', import.meta.url)).toString('base64');
const mark = readFileSync(new URL('../public/favicon.svg', import.meta.url), 'utf8')
  .replaceAll('#016b6b', '#e8c060');

const html = `<!doctype html><meta charset="utf-8"><style>
@font-face{font-family:C;src:url(${font});font-weight:200 1000}
*{margin:0;box-sizing:border-box}
body{width:1200px;height:630px;background:linear-gradient(135deg,#016b6b,#014d4d);color:#fff;font-family:C;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;border:14px solid #e8c060;outline:3px solid rgba(232,192,96,.35);outline-offset:-30px}
svg{width:150px;height:150px}
h1{font-size:104px;font-weight:800;line-height:1.2}
p{font-size:46px;font-weight:500;color:#f5e8d0}
</style><body dir="rtl">${mark}<h1>مناسبات آل سلهب</h1><p>تقويم حجوزات قاعة أفراح آل سلهب</p></body>`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 } });
await page.setContent(html);
await page.evaluate('document.fonts.ready');
writeFileSync(new URL('../public/og.png', import.meta.url), await page.screenshot());
await browser.close();
