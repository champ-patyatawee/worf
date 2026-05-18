import { test, expect } from '@playwright/test';

const ADMIN_EMAIL = 'admin@worf.dev';
const ADMIN_PASSWORD = '123456';

test.describe('Channel List', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 });

    // Login as admin (seeded into all channels)
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible({ timeout: 10000 });

    await page.locator('#email').fill(ADMIN_EMAIL);
    await page.locator('#password').fill(ADMIN_PASSWORD);
    await page.getByRole('button', { name: 'Sign In' }).click();

    await expect(page).toHaveURL(/\/channels/, { timeout: 10000 });
  });

  test('should display channels page after login', async ({ page }) => {
    // Should redirect to /channels/general
    await expect(page).toHaveURL(/\/channels\/general/, { timeout: 5000 });

    // Should see the message input on the channel page
    await expect(page.locator('[placeholder="Type a message..."]')).toBeVisible({ timeout: 5000 });
  });

  test('should display general channel content', async ({ page }) => {
    await expect(page).toHaveURL(/\/channels\/general/, { timeout: 5000 });

    // Should see messages area or "no messages" placeholder
    await page.waitForTimeout(1000);
    const messageArea = page.locator('[class*="overflow-y-auto"]').last();
    await expect(messageArea).toBeVisible({ timeout: 5000 });
  });

  test('should navigate to general channel', async ({ page }) => {
    // Navigate directly to general channel
    await page.goto('/channels/general');
    await expect(page).toHaveURL(/\/channels\/general/, { timeout: 5000 });

    // Should see the message input
    await expect(page.locator('[placeholder="Type a message..."]')).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Direct Channel Navigation', () => {
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

  test('should navigate to /channels/general without 401 errors', async ({ page }) => {
    // Track console errors to detect 401s
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Track failed requests
    const failedRequests: string[] = [];
    page.on('requestfailed', (request) => {
      failedRequests.push(`${request.method()} ${request.url()} - ${request.failure()?.errorText}`);
    });

    await page.goto('/channels/general', { waitUntil: 'networkidle' });

    // Wait for page to settle
    await page.waitForTimeout(2000);

    // Verify no 401 errors occurred
    const unauthorizedErrors = consoleErrors.filter(
      (err) => err.includes('401') || err.includes('Unauthorized') || err.includes('unauthorized')
    );
    expect(unauthorizedErrors).toHaveLength(0);

    // Verify no failed requests due to auth
    const authFailures = failedRequests.filter(
      (req) => req.includes('401') || req.toLowerCase().includes('unauthorized')
    );
    expect(authFailures).toHaveLength(0);

    // Verify URL is correct
    await expect(page).toHaveURL(/\/channels\/general/, { timeout: 5000 });

    // Verify channel content is visible (message input)
    await expect(page.locator('[placeholder="Type a message..."]')).toBeVisible({ timeout: 10000 });
  });

  test('should load general channel messages correctly', async ({ page }) => {
    await page.goto('/channels/general', { waitUntil: 'networkidle' });

    // Should see the message input
    const messageInput = page.locator('[placeholder="Type a message..."]');
    await expect(messageInput).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Channel Messages', () => {
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

  test('should have message input field on general channel', async ({ page }) => {
    await page.goto('/channels/general');

    // Should see the message textarea
    const messageInput = page.locator('[placeholder="Type a message..."]');
    await expect(messageInput).toBeVisible({ timeout: 5000 });
  });

  test('should send a message to general channel', async ({ page }) => {
    await page.goto('/channels/general');
    await page.waitForTimeout(1500);

    // Type a test message
    const testMessage = `Test message ${Date.now()}`;
    const messageInput = page.locator('[placeholder="Type a message..."]');
    await expect(messageInput).toBeVisible({ timeout: 5000 });
    await messageInput.fill(testMessage);
    await messageInput.press('Enter');

    // Wait for message to appear
    await page.waitForTimeout(2000);

    // The message should appear in the message list
    await expect(page.getByText(testMessage)).toBeVisible({ timeout: 5000 });
  });

  test('should display sent message in message list', async ({ page }) => {
    await page.goto('/channels/general');
    await page.waitForTimeout(1000);

    // Type and send a unique test message
    const uniqueMessage = `Unique test ${Date.now()}`;
    const messageInput = page.locator('[placeholder="Type a message..."]');
    await expect(messageInput).toBeVisible({ timeout: 5000 });
    await messageInput.fill(uniqueMessage);
    await messageInput.press('Enter');

    // Wait for the message to appear
    await page.waitForTimeout(2000);

    // The message should appear in the list
    await expect(page.getByText(uniqueMessage)).toBeVisible({ timeout: 5000 });
  });
});
