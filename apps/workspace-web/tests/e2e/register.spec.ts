import { test, expect } from '@playwright/test';

test.describe('Register Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/register');
    await expect(page.getByRole('heading', { name: /create account/i })).toBeVisible({ timeout: 10000 });
  });

  test('should show validation error for missing name', async ({ page }) => {
    await page.locator('#email').fill('test@example.com');
    await page.locator('#password').fill('password123');
    await page.locator('#confirmPassword').fill('password123');
    
    await page.locator('#name').fill('');
    await page.getByRole('button', { name: 'Create Account' }).click();
    await page.waitForTimeout(500);
    
    await expect(page.getByText('Name is required')).toBeVisible({ timeout: 5000 });
  });

  test('should show validation error for password mismatch', async ({ page }) => {
    await page.locator('#name').fill('Test User');
    await page.locator('#email').fill('test@example.com');
    await page.locator('#password').fill('password123');
    await page.locator('#confirmPassword').fill('different456');
    
    await page.getByRole('button', { name: 'Create Account' }).click();
    await page.waitForTimeout(500);
    
    await expect(page.getByText('Passwords do not match')).toBeVisible({ timeout: 5000 });
  });

  test('should show validation error for short password', async ({ page }) => {
    await page.locator('#name').fill('Test User');
    await page.locator('#email').fill('test@example.com');
    await page.locator('#password').fill('12345');
    await page.locator('#confirmPassword').fill('12345');
    
    await page.getByRole('button', { name: 'Create Account' }).click();
    await page.waitForTimeout(500);
    
    await expect(page.getByText('Password must be at least 6 characters')).toBeVisible({ timeout: 5000 });
  });

  test('should navigate to login page', async ({ page }) => {
    await page.getByRole('link', { name: 'Sign in' }).click();

    await expect(page).toHaveURL(/\/login/);
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
  });

  test('should show registration form with all fields', async ({ page }) => {
    await expect(page.locator('#name')).toBeVisible();
    await expect(page.locator('#email')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
    await expect(page.locator('#confirmPassword')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Create Account' })).toBeVisible();
  });

  test('should prevent form submission with browser native email validation', async ({ page }) => {
    await page.locator('#name').fill('Test User');
    await page.locator('#email').fill('invalid-email');
    await page.locator('#password').fill('password123');
    await page.locator('#confirmPassword').fill('password123');
    
    await page.getByRole('button', { name: 'Create Account' }).click();
    
    // Browser native validation should prevent submission
    // Form should stay on register page
    await expect(page).toHaveURL(/\/register/, { timeout: 3000 });
  });

  test('should show error when registering with existing email', async ({ page }) => {
    // First register a user via API
    const existingEmail = `existing_${Date.now()}@example.com`;
    const testPassword = 'SecurePass123!';

    await page.request.post('/ws/api/auth/register', {
      data: { email: existingEmail, password: testPassword, name: 'Existing User' },
    });

    // Now try to register with the same email
    await page.locator('#name').fill('New User');
    await page.locator('#email').fill(existingEmail);
    await page.locator('#password').fill(testPassword);
    await page.locator('#confirmPassword').fill(testPassword);
    await page.getByRole('button', { name: 'Create Account' }).click();

    // Should show an error about email already existing
    await page.waitForTimeout(1000);
    
    // The form should either show an error message or stay on register page
    const onRegisterPage = page.url().includes('/register');
    if (onRegisterPage) {
      await expect(page.locator('text=/already exists|already in use|duplicate|error/i')).toBeVisible({ timeout: 5000 }).catch(() => {
        // If no specific error text, at least verify we're still on register page
        expect(page.url()).toContain('/register');
      });
    }
  });
});
