import { chromium } from '/usr/local/share/bun-global/node_modules/playwright-core/index.mjs';
import fs from 'node:fs';

fs.mkdirSync('.tmp_anim_shots', { recursive: true });

const browser = await chromium.launch({
  executablePath: '/ms-playwright/chrome-headless-shell-linux64/chrome-headless-shell',
  args: [
    '--use-gl=angle',
    '--use-angle=swiftshader',
    '--enable-webgl',
    '--ignore-gpu-blocklist',
    '--no-sandbox',
  ],
});

const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
await page.addInitScript(() => {
  Element.prototype.requestPointerLock = () => Promise.resolve();
});

const consoleErrors = [];
page.on('console', (m) => {
  if (m.type() === 'error') consoleErrors.push(m.text());
});
page.on('pageerror', (e) => consoleErrors.push(String(e)));

await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded', timeout: 30000 });
await page.getByRole('button', { name: /play game/i }).click();

// Wait for HUD & GLB rig preload
await page.locator('text=HP').waitFor({ timeout: 15000 });
await page.waitForTimeout(3000);
await page.screenshot({ path: '.tmp_anim_shots/01_idle_back.png' });

const canvas = page.locator('canvas').first();
const box = await canvas.boundingBox();
const cx = box.x + box.width * 0.5;
const cy = box.y + box.height * 0.5;

// Orbit camera ~135° right to see front-right 3/4 view clearly
await page.mouse.move(cx, cy);
await page.mouse.down();
await page.mouse.move(cx + 520, cy + 20, { steps: 10 });
await page.mouse.up();
await page.waitForTimeout(450);
await page.screenshot({ path: '.tmp_anim_shots/02_idle_front_34.png' });

// Orbit to ~90° side profile so we see leg stride, knee lift, elbow swing & torso lean clearly
await page.mouse.move(cx, cy);
await page.mouse.down();
await page.mouse.move(cx - 240, cy, { steps: 6 });
await page.mouse.up();
await page.waitForTimeout(300);

// Walk/Run forward
await page.keyboard.down('KeyW');
await page.waitForTimeout(420);
await page.screenshot({ path: '.tmp_anim_shots/03_run_side_stride.png' });

// Sprint forward
await page.keyboard.down('ShiftLeft');
await page.waitForTimeout(550);
await page.screenshot({ path: '.tmp_anim_shots/04_sprint_side_stride.png' });

// Curving turn (W + A)
await page.keyboard.up('ShiftLeft');
await page.keyboard.down('KeyA');
await page.waitForTimeout(400);
await page.screenshot({ path: '.tmp_anim_shots/05_turn_curve.png' });

await page.keyboard.up('KeyA');
await page.keyboard.up('KeyW');
await page.waitForTimeout(420);
await page.screenshot({ path: '.tmp_anim_shots/06_stop_settle.png' });

// Orbit back to 3/4 front-right view for Melee Strike & Pistol Aim inspection
await page.mouse.move(cx, cy);
await page.mouse.down();
await page.mouse.move(cx + 520, cy, { steps: 8 });
await page.mouse.up();
await page.waitForTimeout(350);

// Melee swing (KeyQ) - capture mid-strike!
await page.keyboard.press('Digit1');
await page.waitForTimeout(150);
await page.keyboard.press('KeyQ');
await page.waitForTimeout(210);
await page.screenshot({ path: '.tmp_anim_shots/07_melee_strike.png' });
await page.waitForTimeout(500);

// Switch to Service Pistol (Digit3) and fire/aim (KeyQ)
await page.keyboard.press('Digit3');
await page.waitForTimeout(300);
await page.keyboard.press('KeyQ');
await page.waitForTimeout(140);
await page.screenshot({ path: '.tmp_anim_shots/08_pistol_aim_fire.png' });

console.log('Errors:', consoleErrors.length, consoleErrors);
await browser.close();
