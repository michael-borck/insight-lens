// Delete a single survey from the unit detail page, then undo it from the
// success toast. Exercises the ConfirmDialog flow, the main-process undo
// slot, and the query invalidation that restores the row.
import { test, expect } from './helpers';

test('deleting a survey can be undone from the toast', async ({ page }) => {
  await page.getByRole('link', { name: 'Units', exact: true }).click();
  await page.getByText('TEST1001', { exact: true }).click();
  await expect(page.getByRole('heading', { name: 'TEST1001 - Intro to Testing' })).toBeVisible();

  // History is sorted newest-first; delete the older (Semester 1 2024) survey
  // via the trash control in its row.
  const row2024 = page.locator('tr', { hasText: 'Semester 1 2024' });
  await expect(row2024).toBeVisible();
  await row2024.getByTitle('Delete this survey').click();

  // ConfirmDialog: destructive confirm labelled "Delete".
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('heading', { name: 'Delete this survey?' })).toBeVisible();
  await dialog.getByRole('button', { name: 'Delete', exact: true }).click();

  // Success toast carries the period label and an inline Undo button, and
  // the row disappears after query invalidation.
  await expect(page.getByText('Deleted Semester 1 2024')).toBeVisible();
  await expect(row2024).toHaveCount(0);

  // Undo: "Restored <unit> <semester> <year>" toast, and the row is back.
  await page.getByRole('button', { name: 'Undo' }).click();
  await expect(page.getByText('Restored TEST1001 Semester 1 2024')).toBeVisible();
  await expect(page.locator('tr', { hasText: 'Semester 1 2024' })).toBeVisible();
});
