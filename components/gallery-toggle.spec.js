const { test, expect } = require("@playwright/test");

test("Gallery UI - Client can toggle the gallery visibility", async ({
  page,
}) => {
  await page.goto("http://localhost:3000");

  // انتظار تحميل زر الإخفاء/الإظهار
  const toggleButton = page.locator('button:has-text("إخفاء المشاهد ⏭")');
  await toggleButton.waitFor({ state: "visible", timeout: 15000 });

  // التحقق من أن الشريط مفتوح ومرئي
  const gallery = page.locator(".custom-scrollbar");
  await expect(gallery).toBeVisible();

  // الضغط على زر الإخفاء
  await toggleButton.click();

  // التحقق من أن الزر تغير إلى "عرض المشاهد" بنجاح
  const showButton = page.locator('button:has-text("⏮ عرض المشاهد")');
  await expect(showButton).toBeVisible();
});
