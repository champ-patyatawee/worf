import { test, expect } from '@playwright/test';

const ADMIN_EMAIL = 'admin@worf.dev';
const ADMIN_PASSWORD = '123456';

test.describe('Auth Redirects', () => {
  test('should redirect unauthenticated user from /channels to /login', async ({ page }) => {
    await page.goto('/channels');
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible({ timeout: 5000 });
  });

  test('should redirect unauthenticated user from /messages to /login', async ({ page }) => {
    await page.goto('/messages');
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible({ timeout: 5000 });
  });

  test('should redirect unauthenticated user from /settings to /login', async ({ page }) => {
    await page.goto('/settings');
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible({ timeout: 5000 });
  });

  test('should redirect unauthenticated user from /ai-chat to /login', async ({ page }) => {
    await page.goto('/ai-chat');
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible({ timeout: 5000 });
  });

  test('should redirect unauthenticated user from /search to /login', async ({ page }) => {
    await page.goto('/search');
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible({ timeout: 5000 });
  });

  test('should allow unauthenticated user to access /login', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible({ timeout: 10000 });
  });

  test('should allow unauthenticated user to access /register', async ({ page }) => {
    await page.goto('/register');
    await expect(page.getByRole('heading', { name: /create account/i })).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Authenticated Redirects', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible({ timeout: 10000 });
    await page.locator('#email').fill(ADMIN_EMAIL);
    await page.locator('#password').fill(ADMIN_PASSWORD);
    await page.getByRole('button', { name: 'Sign In' }).click();
    await expect(page).toHaveURL(/\/channels/, { timeout: 10000 });
  });

  test('should redirect authenticated user from /login to /channels', async ({ page }) => {
    await page.goto('/login');
    await expect(page).toHaveURL(/\/channels/, { timeout: 10000 });
  });

  test('should redirect authenticated user from /register to /channels', async ({ page }) => {
    await page.goto('/register');
    await expect(page).toHaveURL(/\/channels/, { timeout: 10000 });
  });

  test('should redirect authenticated user from / to /channels', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/channels/, { timeout: 10000 });
  });
});
