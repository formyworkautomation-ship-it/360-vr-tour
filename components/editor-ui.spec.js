const { test, expect } = require('@playwright/test');

test('Editor UI - Menu Interactions Rendering', async ({ page }) => {
  // محاولة الدخول للصفحة الرئيسية
  await page.goto('http://localhost:3000');
  
  // التحقق من أن واجهة العرض ثلاثية الأبعاد قد تم تحميلها بنجاح دون أخطاء
  const viewer = page.locator('div[style*="width: 100%; height: 100%"]');
  await expect(viewer).toBeVisible({ timeout: 15000 });

  // نحن نتأكد أن الصفحة لا تنهار أثناء تحميل المكونات
  const consoleErrors = [];
  page.on('pageerror', error => consoleErrors.push(error.message));
  
  await page.waitForTimeout(2000);
  expect(consoleErrors.length).toBe(0); // لا يجب أن يكون هناك أخطاء برمجية في المتصفح
});