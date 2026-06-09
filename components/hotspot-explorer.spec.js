const { test, expect } = require('@playwright/test');

test('Hotspot Explorer panel is visible and can open edit modal', async ({ page }) => {
  await page.goto('http://localhost:3000');
  
  // التحقق من ظهور اللوحة الجانبية
  const explorerPanel = page.locator('text=📍 إدارة نقاط المشهد الحالي');
  await expect(explorerPanel).toBeVisible({ timeout: 15000 });
  
  // الضغط على أول زر تعديل في القائمة
  const editButton = page.locator('button:has-text("تعديل")').first();
  await editButton.click();
  
  // التحقق من أن نافذة التعديل انفتحت بنجاح
  const editModal = page.locator('text=تخصيص النقطة التفاعلية');
  await expect(editModal).toBeVisible();
});