const { test, expect } = require('@playwright/test');

test('Can delete a hotspot from the edit modal', async ({ page }) => {
  await page.goto('http://localhost:3000');
  
  // انتظار تحميل المشهد والنقاط
  await page.waitForSelector('.hotspot-visual', { timeout: 15000 });
  
  // إيجاد أول نقطة ساخنة والضغط عليها كليك يمين
  const firstHotspot = page.locator('.hotspot-visual').first();
  await firstHotspot.click({ button: 'right' });
  
  // التحقق من ظهور نافذة التعديل
  const editModal = page.locator('text=تخصيص النقطة التفاعلية');
  await expect(editModal).toBeVisible();
  
  // الضغط على زر الحذف
  const deleteButton = page.locator('button:has-text("حذف النقطة")');
  await deleteButton.click();
  
  // التحقق من اختفاء النافذة (مما يعني تنفيذ الدالة بنجاح)
  await expect(editModal).toBeHidden();
});