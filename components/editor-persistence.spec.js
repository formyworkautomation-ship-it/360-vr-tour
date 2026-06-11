const { test, expect } = require('@playwright/test');

test('Editor UI - Persists last used configuration across reloads', async ({ page }) => {
  await page.goto('http://localhost:3000');
  await page.waitForSelector('.hotspot-visual', { timeout: 15000 });

  // فتح القائمة على نقطة وتغيير شكلها للسهم ثلاثي الأبعاد
  const firstHotspot = page.locator('.hotspot-visual').first();
  await firstHotspot.click({ button: 'right' });
  
  const editModal = page.locator('text=تخصيص النقطة التفاعلية');
  await expect(editModal).toBeVisible();

  await page.click('button:has-text("سهم ثلاثي الأبعاد")');
  await page.click('button:has-text("حفظ وتطبيق")');

  // إعادة تحميل الصفحة بالكامل لمحاكاة الدخول الجديد
  await page.reload();
  await page.waitForSelector('.hotspot-visual', { timeout: 15000 });

  // قراءة الذاكرة المحلية للمتصفح للتحقق من حفظ الإعداد كافتراضي
  const savedConfig = await page.evaluate(() => localStorage.getItem('360_last_hotspot_config'));
  expect(savedConfig).toContain('"type":"3d-arrow"');
});