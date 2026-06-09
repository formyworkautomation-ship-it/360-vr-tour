const { test, expect } = require('@playwright/test');

test('Nadir logo is on the floor and visible', async ({ page }) => {
  await page.goto('http://localhost:3000');
  const nadirLogo = page.locator('.nadir-logo').first();
  await expect(nadirLogo).toBeAttached({ timeout: 15000 });
  await expect(nadirLogo.locator('img')).toBeVisible();
});