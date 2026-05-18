import { test, expect, BrowserContext, Page } from '@playwright/test';

const ADMIN_EMAIL = 'admin@worf.dev';
const ADMIN_PASSWORD = '123456';

async function loginAsAdmin(page: Page) {
  await page.goto('/login');
  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible({ timeout: 10000 });
  await page.locator('#email').fill(ADMIN_EMAIL);
  await page.locator('#password').fill(ADMIN_PASSWORD);
  await page.getByRole('button', { name: 'Sign In' }).click();
  await expect(page).toHaveURL(/\/channels/, { timeout: 10000 });
}

async function createUserSession(
  browser: any,
  email: string,
  password: string,
  token: string,
  label: string
): Promise<{ page: Page; ctx: BrowserContext }> {
  const ctx = await browser.newContext({ baseURL: 'http://client:5173' });
  const page = await ctx.newPage();

  // Set auth in localStorage via a login page visit
  await page.goto('/login');
  await page.evaluate(
    ({ token }) => {
      localStorage.setItem(
        'workspace-auth',
        JSON.stringify({
          state: { user: null, token, isAuthenticated: true },
          version: 0,
        })
      );
    },
    { token }
  );

  // Navigate to general channel
  await page.goto('/channels/general');
  await page.waitForTimeout(2000); // Let socket connection establish

  console.log(`[${label}] Session ready`);
  return { page, ctx };
}

async function sendMessage(page: Page, message: string) {
  const input = page.locator('[placeholder="Type a message..."]');
  await expect(input).toBeVisible({ timeout: 5000 });
  await input.fill(message);
  await input.press('Enter');
}

test.describe('Realtime Multi-User Messaging', () => {
  test('3 users should see each other messages in real-time via socket.io', async ({ browser }) => {
    const timestamp = Date.now();

    // ── Setup: Register 2 new users via API ──────────────────
    const setupPage = await browser.newPage({ baseURL: 'http://client:5173' });
    const newUsers = [
      { email: `rt_alice_${timestamp}@example.com`, password: 'SecurePass123!', name: 'Alice' },
      { email: `rt_bob_${timestamp}@example.com`, password: 'SecurePass123!', name: 'Bob' },
    ];

    const registeredUsers: { email: string; password: string; token: string }[] = [];

    for (const user of newUsers) {
      const resp = await setupPage.request.post('/api/auth/register', {
        data: user,
      });
      expect(resp.ok()).toBeTruthy();
      const body = await resp.json();
      const token = body.data?.token || body.token;
      expect(token).toBeTruthy();
      registeredUsers.push({ email: user.email, password: user.password, token });
    }
    await setupPage.close();

    // ── Create 3 user sessions ───────────────────────────────

    // Admin session (login via form)
    const ctxAdmin = await browser.newContext({ baseURL: 'http://client:5173' });
    const pageAdmin = await ctxAdmin.newPage();
    await loginAsAdmin(pageAdmin);
    await pageAdmin.goto('/channels/general');
    await pageAdmin.waitForTimeout(2000);

    // Alice and Bob sessions (localStorage auth)
    const aliceSession = await createUserSession(
      browser,
      registeredUsers[0].email,
      registeredUsers[0].password,
      registeredUsers[0].token,
      'Alice'
    );
    const bobSession = await createUserSession(
      browser,
      registeredUsers[1].email,
      registeredUsers[1].password,
      registeredUsers[1].token,
      'Bob'
    );

    const pages = [aliceSession.page, bobSession.page, pageAdmin];
    const names = ['Alice', 'Bob', 'Admin'];

    // Wait for all pages to have the message input ready
    for (let i = 0; i < pages.length; i++) {
      await expect(pages[i].locator('[placeholder="Type a message..."]')).toBeVisible({
        timeout: 15000,
      });
      console.log(`[${names[i]}] Channel page loaded`);
    }

    // ── Test: Alice sends a message ──────────────────────────
    const msgAlice = `Hello from Alice ${timestamp}`;
    console.log(`[Alice] Sending: "${msgAlice}"`);
    await sendMessage(aliceSession.page, msgAlice);

    // Bob should see Alice's message
    console.log('[Bob] Waiting for Alice message...');
    await expect(bobSession.page.getByText(msgAlice)).toBeVisible({ timeout: 10000 });

    // Admin should see Alice's message
    console.log('[Admin] Waiting for Alice message...');
    await expect(pageAdmin.getByText(msgAlice)).toBeVisible({ timeout: 10000 });

    console.log('[OK] Alice message received by all');

    // ── Test: Bob sends a message ────────────────────────────
    const msgBob = `Hello from Bob ${timestamp}`;
    console.log(`[Bob] Sending: "${msgBob}"`);
    await sendMessage(bobSession.page, msgBob);

    // Alice should see Bob's message
    console.log('[Alice] Waiting for Bob message...');
    await expect(aliceSession.page.getByText(msgBob)).toBeVisible({ timeout: 10000 });

    // Admin should see Bob's message
    console.log('[Admin] Waiting for Bob message...');
    await expect(pageAdmin.getByText(msgBob)).toBeVisible({ timeout: 10000 });

    console.log('[OK] Bob message received by all');

    // ── Test: Admin sends a message ──────────────────────────
    const msgAdmin = `Hello from Admin ${timestamp}`;
    console.log(`[Admin] Sending: "${msgAdmin}"`);
    await sendMessage(pageAdmin, msgAdmin);

    // Alice should see Admin's message
    console.log('[Alice] Waiting for Admin message...');
    await expect(aliceSession.page.getByText(msgAdmin)).toBeVisible({ timeout: 10000 });

    // Bob should see Admin's message
    console.log('[Bob] Waiting for Admin message...');
    await expect(bobSession.page.getByText(msgAdmin)).toBeVisible({ timeout: 10000 });

    console.log('[OK] Admin message received by all');

    // ── Cleanup ──────────────────────────────────────────────
    await aliceSession.ctx.close();
    await bobSession.ctx.close();
    await ctxAdmin.close();

    console.log('[DONE] All real-time messaging tests passed');
  });
});
