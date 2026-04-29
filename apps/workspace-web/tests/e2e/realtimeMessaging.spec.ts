import { test, expect, Page } from '@playwright/test';

interface TestUser {
  email: string;
  password: string;
  name: string;
}

const API_URL = process.env.API_URL || 'http://server:3001';

async function registerUser(page: Page, user: TestUser): Promise<string> {
  const regResponse = await page.request.post(`${API_URL}/api/auth/register`, {
    data: user,
  });
  if (!regResponse.ok()) {
    throw new Error(`Registration failed: ${regResponse.status()}`);
  }
  const regBody = await regResponse.json();
  return regBody.data?.token || regBody.token;
}

function createUser(index: number): TestUser {
  return {
    email: `user${index}_${Date.now()}@test.com`,
    password: 'SecurePass123!',
    name: `User ${index}`,
  };
}

async function sendMessage(page: Page, content: string): Promise<void> {
  console.log('Looking for message input...');
  const input = page.locator('input[type="text"]').last();
  await input.waitFor({ state: 'visible', timeout: 5000 });
  console.log('Found input, filling content...');
  await input.fill(content);
  console.log('Pressing Enter...');
  await input.press('Enter');
  console.log('Message sent!');
}

export default undefined;

test.describe('Real-time Messaging', () => {
  test('should send and receive messages between two users', async ({ browser }) => {
    test.setTimeout(120000);
    
    const user1 = createUser(1);
    const user2 = createUser(2);

    const context1 = await browser.newContext();
    const context2 = await browser.newContext();

    const page1 = await context1.newPage();
    const page2 = await context2.newPage();

    try {
      console.log('Registering user 1...');
      const token1 = await registerUser(page1, user1);
      console.log('User 1 token:', token1 ? 'received' : 'missing');

      console.log('Registering user 2...');
      const token2 = await registerUser(page2, user2);
      console.log('User 2 token:', token2 ? 'received' : 'missing');

      console.log('Setting up auth for user 1...');
      await page1.goto('/login');
      await page1.evaluate(
        (t) => {
          localStorage.setItem(
            'workspace-auth',
            JSON.stringify({ state: { user: null, token: t, isAuthenticated: true }, version: 0 })
          );
        },
        token1
      );

      console.log('Setting up auth for user 2...');
      await page2.goto('/login');
      await page2.evaluate(
        (t) => {
          localStorage.setItem(
            'workspace-auth',
            JSON.stringify({ state: { user: null, token: t, isAuthenticated: true }, version: 0 })
          );
        },
        token2
      );

      console.log('Navigating both users to general channel...');
      await Promise.all([
        page1.goto('/channels/general', { waitUntil: 'networkidle', timeout: 30000 }),
        page2.goto('/channels/general', { waitUntil: 'networkidle', timeout: 30000 }),
      ]);

      console.log('Waiting for pages to load...');
      await page1.waitForTimeout(3000);
      await page2.waitForTimeout(3000);

      console.log('User 1 sending message...');
      await sendMessage(page1, 'Message 1 from User 1');
      await page1.waitForTimeout(1000);

      console.log('Checking if User 1 sees their own message...');
      const msg1Visible = await page1.getByText('Message 1 from User 1').isVisible();
      console.log('User 1 sees own message:', msg1Visible);

      console.log('User 2 sending message...');
      await sendMessage(page2, 'Message 2 from User 2');
      await page2.waitForTimeout(1000);

      console.log('Checking if User 2 sees their own message...');
      const msg2Visible = await page2.getByText('Message 2 from User 2').isVisible();
      console.log('User 2 sees own message:', msg2Visible);

      console.log('Checking if User 1 sees User 2 message (real-time)...');
      const msg2OnUser1 = await page1.getByText('Message 2 from User 2').isVisible({ timeout: 5000 }).catch(() => false);
      console.log('User 1 sees User 2 message:', msg2OnUser1);

      expect(msg1Visible).toBe(true);
      expect(msg2Visible).toBe(true);
      expect(msg2OnUser1).toBe(true);
    } finally {
      await context1.close();
      await context2.close();
    }
  });
});
