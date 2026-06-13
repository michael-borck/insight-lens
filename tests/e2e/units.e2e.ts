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

test('comparison tray: select units, compare, remove a chip', async ({ page }) => {
  await page.getByRole('link', { name: 'Units', exact: true }).click();
  await expect(page.getByText('TEST1001', { exact: true })).toBeVisible();

  // Tick both units' comparison checkboxes (cards view renders one per card).
  const checkboxes = page.locator('input[type="checkbox"]');
  await checkboxes.nth(0).check();
  await checkboxes.nth(1).check();

  // The tray appears with both chips and an enabled Compare button.
  await expect(page.getByRole('button', { name: 'Compare 2 units' })).toBeEnabled();
  await page.getByRole('button', { name: 'Compare 2 units' }).click();

  // Comparison view: honest count, both rows, export available.
  await expect(page.getByText('Unit Comparison (2 units)')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Export CSV' })).toBeEnabled();

  // Remove one unit via its chip without leaving the comparison.
  await page.getByRole('button', { name: 'Remove TEST2002 from comparison' }).click();
  await expect(page.getByText('Unit Comparison (1 unit)')).toBeVisible();

  // Back returns to the list view.
  await page.getByRole('button', { name: /Back to/ }).click();
  await expect(page.getByText('TEST2002', { exact: true })).toBeVisible();
});
