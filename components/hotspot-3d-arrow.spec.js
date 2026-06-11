const { test, expect } = require('@playwright/test');

test('Can select and apply the new 3D arrow hotspot style', async ({ page }) => {
  await page.goto('http://localhost:3000');
  
  // انتظار تحميل المشهد والنقاط
  await page.waitForSelector('.hotspot-visual', { timeout: 15000 });
  
  // إيجاد أول نقطة ساخنة والضغط عليها كليك يمين
  const firstHotspot = page.locator('.hotspot-visual').first();
  await firstHotspot.click({ button: 'right' });
  
  // التحقق من ظهور نافذة التعديل والضغط على الزر الجديد
  const editModal = page.locator('text=تخصيص النقطة التفاعلية');
  await expect(editModal).toBeVisible();
  await page.click('button:has-text("سهم ثلاثي الأبعاد")');
  
  // حفظ التغيير
  await page.click('button:has-text("حفظ وتطبيق")');
  
  // التحقق من أن الشكل الجديد تم تطبيقه على النقطة
  await expect(firstHotspot.locator('.hs-3d-arrow')).toBeVisible();
});