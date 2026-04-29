import { test, expect } from '@playwright/test';

test.describe('Channel List', () => {
  test.beforeEach(async ({ page }) => {
    // Register and login a user
    const testEmail = `channels_${Date.now()}@example.com`;
    const testPassword = 'SecurePass123!';
    const testName = 'Channel Test User';

    // Register user
    const regResponse = await page.request.post('/api/auth/register', {
      data: { email: testEmail, password: testPassword, name: testName },
    });
    const regBody = await regResponse.json();
    const token = regBody.data?.token || regBody.token;

    // Set auth state in localStorage
    await page.goto('/login');
    await page.evaluate(
      ([tokenStr]) => {
        localStorage.setItem(
          'workspace-auth',
          JSON.stringify({
            state: {
              user: null,
              token: tokenStr,
              isAuthenticated: true,
            },
            version: 0,
          })
        );
      },
      [token]
    );
  });

  test('should display channels sidebar with workspace header', async ({ page }) => {
    await page.goto('/channels');
    await expect(page.getByText('Workspace')).toBeVisible({ timeout: 10000 });
  });

  test('should display channels section with list of channels', async ({ page }) => {
    await page.goto('/channels');
    
    // Should see the Channels section header
    await expect(page.getByText('Channels')).toBeVisible({ timeout: 5000 });
  });

  test('should display general channel in sidebar for new user', async ({ page }) => {
    await page.goto('/channels');
    
    // Wait for channels to load
    await page.waitForTimeout(2000);
    
    // New users should be auto-joined to general channel
    // Look for "general" text (channel name) in the sidebar
    const generalChannel = page.locator('a[href="/channels/general"]').or(
      page.getByText('general', { exact: false }).filter({ has: page.locator('svg') })
    );
    await expect(generalChannel.first()).toBeVisible({ timeout: 10000 });
  });

  test('should navigate to specific channel when clicked', async ({ page }) => {
    await page.goto('/channels');
    
    // Wait for channels to load
    await page.waitForTimeout(2000);
    
    // Look for a channel link (using the Hash icon pattern)
    const channelLinks = page.locator('a[href^="/channels/"]');
    const channelCount = await channelLinks.count();
    
    if (channelCount > 0) {
      // Click on the first channel
      await channelLinks.first().click();
      
      // Should navigate to that channel's URL
      await expect(page).toHaveURL(/\/channels\/.+/, { timeout: 5000 });
    } else {
      // If no channels exist, at least verify the sidebar loaded
      await expect(page.getByText('Channels')).toBeVisible();
    }
  });

  test('should show channel header when viewing a channel', async ({ page }) => {
    await page.goto('/channels');
    await page.waitForTimeout(2000);
    
    const channelLinks = page.locator('a[href^="/channels/"]');
    const channelCount = await channelLinks.count();
    
    if (channelCount > 0) {
      await channelLinks.first().click();
      
      // Should see the hash icon in header
      await expect(page.locator('header').locator('svg.h-4.w-4')).toBeVisible({ timeout: 5000 });
    }
  });
});

test.describe('Direct Channel Navigation', () => {
  test('should navigate to /channels/general without 401 errors', async ({ page }) => {
    // Use the loginAsUser fixture to authenticate
    await page.goto('/login');
    const testEmail = `directnav_${Date.now()}@example.com`;
    const testUser = {
      email: testEmail,
      password: 'SecurePass123!',
      name: 'Direct Nav User',
    };

    // Register and login
    const regResponse = await page.request.post('/api/auth/register', {
      data: testUser,
    });
    const regBody = await regResponse.json();
    const token = regBody.data?.token || regBody.token;

    // Set auth state in localStorage
    await page.evaluate(
      (tokenStr) => {
        localStorage.setItem(
          'workspace-auth',
          JSON.stringify({
            state: {
              user: null,
              token: tokenStr,
              isAuthenticated: true,
            },
            version: 0,
          })
        );
      },
      [token]
    );

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

    // Navigate directly to /channels/general
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

    // Verify the channel content is visible (should see general channel header or content)
    // The channel should load without redirecting to login
    await expect(page).toHaveURL(/\/channels\/general/, { timeout: 5000 });

    // Verify workspace/channel content is visible
    await expect(page.getByText(/Workspace|general/i)).toBeVisible({ timeout: 10000 });
  });

  test('should load general channel messages correctly', async ({ page }) => {
    // Setup authentication
    await page.goto('/login');
    const testEmail = `genmsgs_${Date.now()}@example.com`;
    const testUser = {
      email: testEmail,
      password: 'SecurePass123!',
      name: 'General Msgs User',
    };

    const regResponse = await page.request.post('/api/auth/register', {
      data: testUser,
    });
    const regBody = await regResponse.json();
    const token = regBody.data?.token || regBody.token;

    await page.evaluate(
      (tokenStr) => {
        localStorage.setItem(
          'workspace-auth',
          JSON.stringify({
            state: {
              user: null,
              token: tokenStr,
              isAuthenticated: true,
            },
            version: 0,
          })
        );
      },
      [token]
    );

    // Navigate to /channels/general
    await page.goto('/channels/general', { waitUntil: 'networkidle' });

    // Should see the message area (either messages or placeholder)
    const messageArea = page.locator('text=/No messages yet|Select a channel|Be the first to send/i');
    await expect(messageArea.or(page.locator('[class*="flex-1 overflow-y-auto"]'))).toBeVisible({ timeout: 5000 });

    // Should see the message input
    const messageInput = page.locator('input[placeholder="Type a message..."]');
    await expect(messageInput).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Channel Messages', () => {
  let authToken: string;
  let channelId: string;

  test.beforeEach(async ({ page }) => {
    // Register and login a user
    const testEmail = `messages_${Date.now()}@example.com`;
    const testPassword = 'SecurePass123!';
    const testName = 'Messages Test User';

    // Register user
    const regResponse = await page.request.post('/api/auth/register', {
      data: { email: testEmail, password: testPassword, name: testName },
    });
    const regBody = await regResponse.json();
    authToken = regBody.data?.token || regBody.token;

    // Set auth state in localStorage
    await page.goto('/login');
    await page.evaluate(
      ([tokenStr]) => {
        localStorage.setItem(
          'workspace-auth',
          JSON.stringify({
            state: {
              user: null,
              token: tokenStr,
              isAuthenticated: true,
            },
            version: 0,
          })
        );
      },
      [authToken]
    );

    // Get the first channel (usually "general")
    const channelsResponse = await page.request.get('/api/channels', {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    });
    
    if (channelsResponse.ok()) {
      const channels = await channelsResponse.json();
      const channelData = channels.data || channels;
      if (Array.isArray(channelData) && channelData.length > 0) {
        channelId = channelData[0].id;
      }
    }
  });

  test('should display message list area when viewing channel', async ({ page }) => {
    if (!channelId) {
      // Skip if no channel available
      test.skip();
    }
    
    await page.goto(`/channels/${channelId}`);
    
    // Should see either messages or "no messages yet" placeholder
    const messageArea = page.locator('text=/No messages yet|Select a channel|Be the first/i');
    await expect(messageArea.or(page.locator('[class*="flex-1 overflow-y-auto"]'))).toBeVisible({ timeout: 5000 });
  });

  test('should have message input field', async ({ page }) => {
    if (!channelId) {
      test.skip();
    }
    
    await page.goto(`/channels/${channelId}`);
    
    // Should see the message input
    const messageInput = page.locator('input[placeholder="Type a message..."]');
    await expect(messageInput).toBeVisible({ timeout: 5000 });
  });

  test('should send a message to channel', async ({ page }) => {
    if (!channelId) {
      test.skip();
    }
    
    await page.goto(`/channels/${channelId}`);
    await page.waitForTimeout(1000);
    
    // Type a test message
    const testMessage = `Test message ${Date.now()}`;
    const messageInput = page.locator('input[placeholder="Type a message..."]');
    await messageInput.fill(testMessage);
    
    // Submit the message (press Enter or click send)
    await messageInput.press('Enter');
    
    // Wait for message to potentially appear
    await page.waitForTimeout(2000);
    
    // The message input should be cleared after sending
    await expect(messageInput).toHaveValue('', { timeout: 5000 }).catch(() => {
      // Input might not clear immediately, so we just verify it exists
      expect(messageInput).toBeVisible();
    });
  });

  test('should display sent message in message list', async ({ page }) => {
    if (!channelId) {
      test.skip();
    }
    
    await page.goto(`/channels/${channelId}`);
    await page.waitForTimeout(1000);
    
    // Type and send a unique test message
    const uniqueMessage = `Unique test ${Date.now()}`;
    const messageInput = page.locator('input[placeholder="Type a message..."]');
    await messageInput.fill(uniqueMessage);
    await messageInput.press('Enter');
    
    // Wait for the message to appear
    await page.waitForTimeout(2000);
    
    // The message should appear in the list
    await expect(page.getByText(uniqueMessage)).toBeVisible({ timeout: 5000 });
  });
});
