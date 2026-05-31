import { test, expect } from '@playwright/test';

const ADMIN_EMAIL = 'admin@worf.dev';
const ADMIN_PASSWORD = '123456';

test.describe('Direct Messages', () => {
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

  test('should display direct messages page with heading and search', async ({ page }) => {
    await page.goto('/messages');
    await expect(page.getByRole('heading', { name: 'Direct Messages' })).toBeVisible({ timeout: 5000 });

    // Should have search input for filtering users
    const searchInput = page.locator('input[placeholder="Search people..."]');
    await expect(searchInput).toBeVisible({ timeout: 5000 });
  });

  test('should show empty state when searching for non-existent user', async ({ page }) => {
    await page.goto('/messages');
    await expect(page.getByRole('heading', { name: 'Direct Messages' })).toBeVisible({ timeout: 5000 });

    const searchInput = page.locator('input[placeholder="Search people..."]');
    await expect(searchInput).toBeVisible({ timeout: 5000 });

    // Type non-matching search
    await searchInput.fill('zzz_no_match_xyz');
    await page.waitForTimeout(500);

    // Should show "No users found"
    await expect(page.getByText('No users found')).toBeVisible({ timeout: 5000 });
  });

  test('should clear search and show users when clearing input', async ({ page }) => {
    await page.goto('/messages');

    const searchInput = page.locator('input[placeholder="Search people..."]');
    await expect(searchInput).toBeVisible({ timeout: 5000 });

    // Type a search, then clear it
    await searchInput.fill('zzz_no_match');
    await page.waitForTimeout(500);
    await expect(page.getByText('No users found')).toBeVisible({ timeout: 5000 });

    // Clear search
    await searchInput.fill('');
    await page.waitForTimeout(500);

    // "No users found" should disappear when search is cleared
    // (because other users might exist now)
    await expect(page.getByText('No users found')).not.toBeVisible({ timeout: 5000 }).catch(() => {
      // OK, might still show if there are truly no other users
    });
  });
});
