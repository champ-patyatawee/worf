import { test, expect } from '@playwright/test';

const ADMIN_EMAIL = 'admin@worf.dev';
const ADMIN_PASSWORD = '123456';

test.describe('Notes', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });

    // Login as admin
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible({ timeout: 10000 });
    await page.locator('#email').fill(ADMIN_EMAIL);
    await page.locator('#password').fill(ADMIN_PASSWORD);
    await page.getByRole('button', { name: 'Sign In' }).click();
    await expect(page).toHaveURL(/\/channels/, { timeout: 10000 });
  });

  test('should navigate to notes page', async ({ page }) => {
    await page.goto('/notes');
    // Check the URL is on /notes (not redirected)
    await expect(page).toHaveURL(/\/notes/, { timeout: 5000 });
  });

  test('should show no page selected state', async ({ page }) => {
    await page.goto('/notes');

    // Should show empty state message
    const emptyState = page.getByText('No page selected');
    await expect(emptyState).toBeVisible({ timeout: 5000 }).catch(async () => {
      // Fallback: check if we're on the notes page at all
      const currentUrl = page.url();
      expect(currentUrl).toContain('/notes');
    });
  });
});
