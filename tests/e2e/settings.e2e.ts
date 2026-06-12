// Settings page: the database path field reflects the isolated temp DB
// (proving the userData/config.json isolation works end to end) and the AI
// provider dropdown is populated from the main-process provider registry.
import { test, expect } from './helpers';

test('settings shows the temp database path and the AI provider options', async ({ page, launched }) => {
  await page.getByRole('link', { name: 'Settings', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Settings' })).toBeVisible();

  // Data Storage: the (read-only) path input shows the seeded temp DB path.
  await expect(page.getByPlaceholder('Choose a folder...')).toHaveValue(launched.dbPath);

  // AI Service dropdown (first <select> on the page) renders the provider
  // catalog, including the local Ollama option.
  const providerSelect = page.locator('select').first();
  await expect(providerSelect.locator('option', { hasText: 'Ollama (local)' })).toHaveCount(1);
  expect(await providerSelect.locator('option').count()).toBeGreaterThan(1);
});
