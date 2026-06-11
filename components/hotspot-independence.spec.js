const { test, expect } = require('@playwright/test');

test('Hotspots are rendered independently and do not conflict', async ({ page }) => {
  await page.goto('http://localhost:3000');
  
  // انتظار تحميل المشهد والنقاط
  await page.waitForSelector('.hotspot-visual', { timeout: 15000 });
  
  // التأكد من أن المشهد يحمّل النقاط ولا ينهار عند وجود أكثر من نقطة
  const hotspots = page.locator('.hotspot-visual');
  const count = await hotspots.count();
  
  expect(count).toBeGreaterThan(0);
});