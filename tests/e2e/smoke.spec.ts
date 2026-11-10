import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

// Smoke #1b: root layout (lang, font Inter, token) + axe tanpa pelanggaran serius.
test('halaman / tampil, lang="id", font & token terpasang, axe bersih', async ({ page }, info) => {
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('lang', 'id');
  await expect(page.getByRole('heading', { name: 'Pusat Dapur' })).toBeVisible();

  const gaya = await page.evaluate(() => {
    const body = getComputedStyle(document.body);
    const root = getComputedStyle(document.documentElement);
    return {
      font: body.fontFamily,
      background: body.backgroundColor,
      primary: root.getPropertyValue('--primary').trim(),
    };
  });
  expect(gaya.font).toMatch(/inter/i);
  expect(gaya.background).toBe('rgb(246, 247, 245)');
  expect(gaya.primary.toLowerCase()).toBe('#15803d');

  const scrollX = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );
  expect(scrollX).toBe(false);

  const { violations } = await new AxeBuilder({ page }).analyze();
  const serius = violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
  expect(serius, JSON.stringify(serius, null, 2)).toEqual([]);

  await page.screenshot({
    path: info.outputPath(`beranda-${info.project.name}.png`),
    fullPage: true,
  });
});
