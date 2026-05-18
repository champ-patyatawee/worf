import { test, expect } from '@playwright/test';

const ADMIN_EMAIL = 'admin@worf.dev';
const ADMIN_PASSWORD = '123456';

test.describe('Admin Settings', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible({ timeout: 10000 });

    await page.locator('#email').fill(ADMIN_EMAIL);
    await page.locator('#password').fill(ADMIN_PASSWORD);
    await page.getByRole('button', { name: 'Sign In' }).click();

    // Should land on channels page
    await expect(page).toHaveURL(/\/channels/, { timeout: 10000 });
  });

  test('should access settings page as admin', async ({ page }) => {
    await page.goto('/settings');

    // Should redirect to /settings/ai
    await expect(page).toHaveURL(/\/settings\/ai/, { timeout: 10000 });

    // Verify settings sidebar is visible
    await expect(page.getByText('Settings')).toBeVisible();

    // Verify settings tabs are visible
    await expect(page.getByRole('link', { name: 'AI Provider' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Prompt Templates' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Tools' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Note LLM' })).toBeVisible();
  });

  test('should see AI Providers page with heading and empty state', async ({ page }) => {
    await page.goto('/settings');

    // Should land on AI Providers tab
    await expect(page).toHaveURL(/\/settings\/ai/, { timeout: 10000 });
    await expect(page.getByRole('heading', { name: 'AI Providers' })).toBeVisible();
    await expect(page.getByText('Manage AI provider configurations')).toBeVisible();

    // Should see the Add Provider button
    await expect(page.getByRole('button', { name: 'Add Provider' })).toBeVisible();

    // Should show empty state since no providers configured
    await expect(page.getByText('No providers configured')).toBeVisible();
  });

  test('should navigate between settings tabs', async ({ page }) => {
    await page.goto('/settings');

    // Click on Prompt Templates tab
    await page.getByRole('link', { name: 'Prompt Templates' }).click();
    await expect(page).toHaveURL(/\/settings\/prompts/, { timeout: 10000 });

    // Click on Tools tab
    await page.getByRole('link', { name: 'Tools' }).click();
    await expect(page).toHaveURL(/\/settings\/tools/, { timeout: 10000 });

    // Click on Note LLM tab
    await page.getByRole('link', { name: 'Note LLM' }).click();
    await expect(page).toHaveURL(/\/settings\/note/, { timeout: 10000 });

    // Click back on AI Provider tab
    await page.getByRole('link', { name: 'AI Provider' }).click();
    await expect(page).toHaveURL(/\/settings\/ai/, { timeout: 10000 });
  });
});
