// Smoke test: the app launches against the seeded database, the sidebar
// renders, the dashboard stat cards show the seeded totals, and the
// onboarding splash stays away (showOnboardingOnStartup=false in the
// seeded config.json).
import { test, expect, SEED } from './helpers';

test('dashboard shows seeded totals and no onboarding splash', async ({ page }) => {
  // Sidebar navigation is up.
  await expect(page.getByRole('link', { name: 'Dashboard', exact: true })).toBeVisible();

  // Stat cards: "<label>" <p> followed by the value <p> (see Dashboard.tsx).
  await expect(page.locator('p:text-is("Total Units") + p')).toHaveText(String(SEED.totalUnits));
  await expect(page.locator('p:text-is("Total Surveys") + p')).toHaveText(String(SEED.totalSurveys));

  // The onboarding splash's first slide is titled "Welcome to InsightLens";
  // with data seeded the dashboard empty state (same words) never renders
  // either, so the text must not appear anywhere.
  await expect(page.getByText('Welcome to InsightLens')).toHaveCount(0);
});
