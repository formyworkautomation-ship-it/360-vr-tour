const { test, expect } = require("@playwright/test");

test("Can select and apply 3D Blur hotspot with specific dimensions", async ({
  page,
}) => {
  await page.goto("http://localhost:3000");
  await page.waitForSelector(".hotspot-visual", { timeout: 15000 });

  const firstHotspot = page.locator(".hotspot-visual").first();
  await firstHotspot.click({ button: "right" });

  const editModal = page.locator("text=تخصيص النقطة التفاعلية");
  await expect(editModal).toBeVisible();

  // اختيار الشكل الجديد
  await page.click('button:has-text("مربع تشويش (Blur)")');

  // تغيير العرض (Width) باستخدام الـ Slider
  const widthSlider = page.locator('input[type="range"]').nth(2); // الثالث بعد الشفافية والدوران
  await widthSlider.fill("250");

  await page.click('button:has-text("حفظ وتطبيق")');

  // التحقق من تطبيق الـ CSS المخصص للتشويش بالحجم الجديد
  const blurContainer = firstHotspot.locator(".hs-icon-container > div");
  await expect(blurContainer).toHaveAttribute("style", /backdrop-filter: blur/);
  await expect(blurContainer).toHaveAttribute("style", /width: 250px/);
});
