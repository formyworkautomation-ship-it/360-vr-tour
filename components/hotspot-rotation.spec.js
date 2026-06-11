const { test, expect } = require('@playwright/test');

test('Can change hotspot rotation and apply it', async ({ page }) => {
  await page.goto('http://localhost:3000');
  await page.waitForSelector('.hotspot-visual', { timeout: 15000 });
  
  const firstHotspot = page.locator('.hotspot-visual').first();
  await firstHotspot.click({ button: 'right' });
  
  const editModal = page.locator('text=تخصيص النقطة التفاعلية');
  await expect(editModal).toBeVisible();
  
  // التغيير لسهم عائم لملاحظة الدوران بوضوح
  await page.click('button:has-text("سهم عائم")');
  
  // إيجاد شريط الدوران وتغيير قيمته لـ 90 درجة
  const rotationSlider = page.locator('input[type="range"]').nth(1); // الثاني في القائمة
  await rotationSlider.fill('90');
  
  await page.click('button:has-text("حفظ وتطبيق")');
  
  // التحقق من تطبيق الـ CSS البرمجي على الحاوية
  const iconContainer = firstHotspot.locator('.hs-icon-container > div');
  await expect(iconContainer).toHaveAttribute('style', /rotate\(90deg\)/);
});