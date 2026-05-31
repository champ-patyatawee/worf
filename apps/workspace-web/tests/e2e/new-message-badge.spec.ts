import { test, expect, Page } from '@playwright/test';

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

test.describe('New Message Badge', () => {
  test('should show new message badge when scrolled up and another user sends a message', async ({ browser }) => {
    const timestamp = Date.now();

    // ── Setup: Register Bob via API ──────────────────────────
    const setupPage = await browser.newPage({ baseURL: 'http://client:5173' });
    const bobEmail = `badge_bob_${timestamp}@example.com`;
    const bobResp = await setupPage.request.post('/ws/api/auth/register', {
      data: { email: bobEmail, password: 'SecurePass123!', name: 'Bob' },
    });
    expect(bobResp.ok()).toBeTruthy();
    const bobBody = await bobResp.json();
    const bobToken = bobBody.data?.token || bobBody.token;
    expect(bobToken).toBeTruthy();
    await setupPage.close();

    // ── Alice: admin login via form ──────────────────────────
    const ctxAlice = await browser.newContext({ baseURL: 'http://client:5173' });
    const pageAlice = await ctxAlice.newPage();
    await pageAlice.setViewportSize({ width: 1280, height: 720 });
    await loginAsAdmin(pageAlice);
    await pageAlice.goto('/channels/general');
    await pageAlice.waitForTimeout(2000);
    await expect(pageAlice.locator('[placeholder="Type a message..."]')).toBeVisible({ timeout: 10000 });

    // ── Bob: login via localStorage ──────────────────────────
    const ctxBob = await browser.newContext({ baseURL: 'http://client:5173' });
    const pageBob = await ctxBob.newPage();
    await pageBob.setViewportSize({ width: 1280, height: 720 });
    await pageBob.goto('/login');
    await pageBob.evaluate((token) => {
      localStorage.setItem('workspace-auth', JSON.stringify({
        state: { user: null, token, isAuthenticated: true },
        version: 0,
      }));
    }, bobToken);
    await pageBob.goto('/channels/general');
    await pageBob.waitForTimeout(2000);
    await expect(pageBob.locator('[placeholder="Type a message..."]')).toBeVisible({ timeout: 10000 });

    // ── Bob fills channel with messages to create scroll ─────
    for (let i = 1; i <= 25; i++) {
      await pageBob.locator('[placeholder="Type a message..."]').fill(`Fill msg ${i}`);
      await pageBob.locator('[placeholder="Type a message..."]').press('Enter');
      await pageBob.waitForTimeout(100);
    }
    // Wait for Alice to receive all fill messages via socket
    await pageAlice.waitForTimeout(2000);

    // ── Alice scrolls up the message container ───────────────
    await pageAlice.evaluate(() => {
      const containers = document.querySelectorAll<HTMLElement>('[class*="overflow-y-auto"]');
      let target: HTMLElement | null = null;
      let maxScroll = 0;
      containers.forEach(el => {
        if (el.scrollHeight > maxScroll) {
          maxScroll = el.scrollHeight;
          target = el;
        }
      });
      if (target && target.scrollHeight > target.clientHeight + 100) {
        target.scrollTop = 0;
        target.dispatchEvent(new Event('scroll', { bubbles: true }));
      }
    });
    await pageAlice.waitForTimeout(500);

    // ── Bob sends the trigger message ────────────────────────
    const testMsg = `Badge test ${timestamp}`;
    await pageBob.locator('[placeholder="Type a message..."]').fill(testMsg);
    await pageBob.locator('[placeholder="Type a message..."]').press('Enter');

    // ── Alice should see the "N new message" badge ──────────
    await expect(pageAlice.getByText(/new message/)).toBeVisible({ timeout: 15000 });

    // ── Click badge → scrolls down → badge disappears ──────
    await pageAlice.getByText(/new message/).click();
    await pageAlice.waitForTimeout(1000);
    await expect(pageAlice.getByText(/new message/)).not.toBeVisible({ timeout: 5000 });

    // ── Verify Alice can see Bob's message ──────────────────
    await expect(pageAlice.getByText(testMsg)).toBeVisible({ timeout: 5000 });

    // Cleanup
    await ctxAlice.close();
    await ctxBob.close();
  });
});
