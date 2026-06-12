// Units list -> unit detail navigation over the seeded data.
import { test, expect, SEED } from './helpers';

test('units page lists seeded units and detail shows full survey history', async ({ page }) => {
  // Navigate via the sidebar ("Units" exact — distinct from "View All Units").
  await page.getByRole('link', { name: 'Units', exact: true }).click();

  // Both seeded unit codes are visible (cards view for a 2-unit DB).
  await expect(page.getByText('TEST1001', { exact: true })).toBeVisible();
  await expect(page.getByText('TEST2002', { exact: true })).toBeVisible();

  // Click through to TEST1001's detail page.
  await page.getByText('TEST1001', { exact: true }).click();
  await expect(
    page.getByRole('heading', { name: `TEST1001 - ${SEED.units[0].name}` }),
  ).toBeVisible();

  // Survey history table lists both seeded periods (one row each).
  for (const period of SEED.periods) {
    await expect(page.locator('tr', { hasText: period })).toBeVisible();
  }
});
