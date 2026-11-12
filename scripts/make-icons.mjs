// Renders the app icons (PNG) from the logo. Run: node scripts/make-icons.mjs
// Needs Playwright's Chromium (npx playwright install chromium). Output goes to public/.
import process from 'node:process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { chromium } from '@playwright/test';

const TEAL = '#016b6b';
// Solid background, white logo kept inside the centre 66% so a circular "maskable" crop never cuts it.
const svg = (size) => `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="${TEAL}"/>
  <g transform="translate(88 88) scale(4.2)" fill="none" stroke="#fff" stroke-width="2.6" stroke-linejoin="round">
    <circle cx="40" cy="40" r="38" opacity="0.55"/>
    <path d="M40 8 L62 18 L72 40 L62 62 L40 72 L18 62 L8 40 L18 18 Z" opacity="0.8"/>
    <path d="M40 22 L52 40 L40 58 L28 40 Z" fill="#fff" fill-opacity="0.2" stroke-width="3"/>
    <g fill="#fff" stroke="none"><circle cx="40" cy="16" r="3"/><circle cx="64" cy="40" r="3"/><circle cx="40" cy="64" r="3"/><circle cx="16" cy="40" r="3"/></g>
  </g>
</svg>`;

const OUT = [
  ['icon-192.png', 192],
  ['icon-512.png', 512],
  ['icon-maskable-512.png', 512],
  ['apple-touch-icon.png', 180],
];

mkdirSync('public', { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage();
for (const [name, size] of OUT) {
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(`<body style="margin:0">${svg(size)}</body>`);
  writeFileSync(`public/${name}`, await page.screenshot({ clip: { x: 0, y: 0, width: size, height: size } }));
  process.stdout.write(`wrote public/${name}\n`);
}
await browser.close();
