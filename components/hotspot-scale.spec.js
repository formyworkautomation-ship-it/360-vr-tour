import { test, expect } from '@playwright/test';

test('Hotspot Depth Scaling Application', async ({ page }) => {
  await page.goto('http://localhost:3000');
  
  // انتظار تحميل المنظومة وظهور النقاط الساخنة
  const hotspot = page.locator('.hotspot-visual').first();
  await hotspot.waitFor({ state: 'visible', timeout: 15000 });

  // التحقق من أن النقطة تحتوي على متغير التحجيم
  const style = await hotspot.getAttribute('style');
  expect(style).toContain('--depth-scale');
  
  // قراءة قيمة الحجم المبدئية
  const scaleMatch = style.match(/--depth-scale:\s*([0-9.]+)/);
  expect(scaleMatch).not.toBeNull();
  
  console.log(`✅ حجم النقطة الحالي: ${scaleMatch[1]}`);
});