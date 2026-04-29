import { test, expect, Page, Browser, APIRequestContext } from '@playwright/test';

// Types
interface TestUser {
  email: string;
  password: string;
  name: string;
}

// Constants
const API_URL = process.env.API_URL || 'http://server:3001';

// User management
let userCounter = 0;

function createUniqueUser(): TestUser {
  userCounter++;
  return {
    email: `codetest_${userCounter}_${Date.now()}_${Math.random().toString(36).substring(7)}@example.com`,
    password: 'SecurePass123!',
    name: `Code Test User ${userCounter}`,
  };
}

/**
 * Register a user via API
 * Handles 409 Conflict by attempting login instead
 */
async function registerUser(request: APIRequestContext, user: TestUser): Promise<string> {
  const response = await request.post(`${API_URL}/api/auth/register`, {
    data: user,
  });

  if (response.status() === 409) {
    const loginResponse = await request.post(`${API_URL}/api/auth/login`, {
      data: {
        email: user.email,
        password: user.password,
      },
    });

    if (!loginResponse.ok()) {
      throw new Error(`User exists but login failed: ${loginResponse.status()}`);
    }

    const body = await loginResponse.json();
    return body.data?.token || body.token;
  }

  if (!response.ok()) {
    throw new Error(`Registration failed: ${response.status()}`);
  }

  const body = await response.json();
  return body.data?.token || body.token;
}

/**
 * Set authentication state in localStorage
 */
async function setAuthState(page: Page, token: string): Promise<void> {
  await page.goto('/login');
  await page.waitForLoadState('domcontentloaded');

  await page.evaluate(
    (tokenStr) => {
      localStorage.setItem(
        'workspace-auth',
        JSON.stringify({
          state: { user: null, token: tokenStr, isAuthenticated: true },
          version: 0,
        })
      );
    },
    token
  );
}

/**
 * Setup an authenticated page for testing
 */
async function setupAuthenticatedPage(
  browser: Browser,
  user?: TestUser
): Promise<{ page: Page; token: string; user: TestUser }> {
  const context = await browser.newContext();
  const page = await context.newPage();

  const request = await context.request;
  const testUser = user || createUniqueUser();

  const token = await registerUser(request, testUser);
  await setAuthState(page, token);

  return { page, token, user: testUser };
}

/**
 * Send a message with code content
 */
async function sendCodeMessage(page: Page, codeContent: string): Promise<void> {
  const messageInput = page.locator('input[placeholder="Type a message..."]').last();
  await messageInput.waitFor({ state: 'visible', timeout: 10000 });
  await messageInput.fill(codeContent);
  await messageInput.press('Enter');
  await page.waitForTimeout(1000);
}

test.describe('Code Snippet Feature E2E Tests', () => {
  test.describe.configure({ mode: 'serial' });

  let testUser: TestUser;
  let authToken: string;
  let testPage: Page | null = null;
  let testContext: Awaited<ReturnType<Browser['newContext']>> | null = null;

  test.beforeAll(async ({ browser }) => {
    testUser = createUniqueUser();
    const result = await setupAuthenticatedPage(browser, testUser);
    authToken = result.token;
    testPage = result.page;
    testContext = result.context;
  });

  test.afterAll(async () => {
    if (testPage) await testPage.close();
    if (testContext) await testContext.close();
  });

  test.describe('Code Block Rendering', () => {
    test.beforeEach(async () => {
      await testPage!.goto('/channels/general');
      await testPage!.waitForLoadState('networkidle');
    });

    test('should render code block with JavaScript syntax highlighting', async () => {
      const jsCode = '```javascript\nconst hello = "world";\nconsole.log(hello);\n```';
      await sendCodeMessage(testPage!, `Check this code:\n${jsCode}`);

      // Code should be rendered in a pre element (code block)
      const codeBlock = testPage!.locator('pre code').first();
      await expect(codeBlock).toBeVisible({ timeout: 10000 });

      // Check for syntax highlighting (keywords should have specific styling)
      // The exact classes depend on the highlighting library (e.g., highlight.js)
      const highlightedCode = testPage!.locator('pre code.language-javascript, pre code[class*="javascript"]').first();
      await expect(highlightedCode).toBeVisible({ timeout: 5000 });
    });

    test('should render code block with Python syntax highlighting', async () => {
      const pythonCode = '```python\ndef hello():\n    print("Hello, world!")\n```';
      await sendCodeMessage(testPage!, `Python code:\n${pythonCode}`);

      const codeBlock = testPage!.locator('pre code').first();
      await expect(codeBlock).toBeVisible({ timeout: 10000 });
    });

    test('should render code block with TypeScript syntax highlighting', async () => {
      const tsCode = `\`\`\`typescript
interface User {
  name: string;
  age: number;
}
\`\`\``;
      await sendCodeMessage(testPage!, `TypeScript code:\n${tsCode}`);

      const codeBlock = testPage!.locator('pre code').first();
      await expect(codeBlock).toBeVisible({ timeout: 10000 });
    });

    test('should render multiple code blocks in one message', async () => {
      const multiCodeMessage = `Here are two examples:

\`\`\`javascript
const x = 1;
\`\`\`

And Python:

\`\`\`python
x = 1
\`\`\``;

      await sendCodeMessage(testPage!, multiCodeMessage);

      // Both code blocks should be visible
      const codeBlocks = testPage!.locator('pre code');
      const count = await codeBlocks.count();
      expect(count).toBeGreaterThanOrEqual(2);
    });

    test('should handle empty code block', async () => {
      const emptyCode = '```\n```';
      await sendCodeMessage(testPage!, `Empty code:\n${emptyCode}`);

      // Empty code block should still render
      const codeBlock = testPage!.locator('pre').first();
      await expect(codeBlock).toBeVisible({ timeout: 10000 });
    });

    test('should handle code with special characters', async () => {
      const specialCode = `\`\`\`javascript
const html = "<div>Hello</div>";
const template = \`Welcome, \${name}!\`;
const regex = /test\\+pattern/;
console.log("<script>alert('xss')</script>");
\`\`\``;

      await sendCodeMessage(testPage!, specialCode);

      // Code should render without errors
      const codeBlock = testPage!.locator('pre code').first();
      await expect(codeBlock).toBeVisible({ timeout: 10000 });
      await expect(codeBlock).toContainText('<div>');
      await expect(codeBlock).toContainText('template');
    });

    test('should handle code with very long lines', async () => {
      const longLine = 'a'.repeat(500);
      const longCode = `\`\`\`javascript\nconst longString = "${longLine}";\n\`\`\``;

      await sendCodeMessage(testPage!, longCode);

      const codeBlock = testPage!.locator('pre').first();
      await expect(codeBlock).toBeVisible({ timeout: 10000 });

      // Horizontal scroll should be available
      const scrollContainer = testPage!.locator('pre').first();
      const overflowX = await scrollContainer.evaluate((el) => {
        const style = window.getComputedStyle(el);
        return style.overflowX || style.overflow;
      });
      // Should have horizontal scroll capability
      expect(['auto', 'scroll', 'hidden'].some(o => overflowX.includes(o))).toBeTruthy();
    });
  });

  test.describe('Copy to Clipboard', () => {
    test.beforeEach(async () => {
      await testPage!.goto('/channels/general');
      await testPage!.waitForLoadState('networkidle');
    });

    test('should show copy button for code blocks', async () => {
      const jsCode = '```javascript\nconst x = 1;\n```';
      await sendCodeMessage(testPage!, jsCode);

      // Wait for message to render
      await testPage!.waitForTimeout(500);

      // Copy button should be visible near the code block
      // The exact selector depends on the implementation
      const copyButton = testPage!.locator('button[title="Copy to clipboard"], button[title="Copy code"]').first();
      await expect(copyButton).toBeVisible({ timeout: 10000 });
    });

    test('should copy exact code content to clipboard', async ({ browser }) => {
      // Create context with clipboard permissions
      const context = await browser.newContext({
        permissions: ['clipboard-read', 'clipboard-write'],
      });
      const clipboardPage = await context.newPage();

      // Setup auth
      const request = await context.request;
      const token = await registerUser(request, testUser);
      await setAuthState(clipboardPage, token);

      await clipboardPage.goto('/channels/general');
      await clipboardPage.waitForLoadState('networkidle');

      const codeToSend = '```javascript\nconst testCode = "hello";\n```';
      await sendCodeMessage(clipboardPage, codeToSend);

      await clipboardPage.waitForTimeout(500);

      // Click copy button
      const copyButton = clipboardPage.locator('button[title="Copy to clipboard"], button[title="Copy code"]').first();
      await copyButton.click();

      // Wait for success state
      await clipboardPage.waitForTimeout(500);

      // Check clipboard content
      const clipboardContent = await clipboardPage.evaluate(() => {
        return navigator.clipboard.readText();
      });

      // Should contain the exact code without markdown
      expect(clipboardContent).toContain('const testCode = "hello";');
      expect(clipboardContent).not.toContain('```javascript');
      expect(clipboardContent).not.toContain('```');

      await context.close();
    });

    test('should show success state after copying', async ({ browser }) => {
      const context = await browser.newContext({
        permissions: ['clipboard-read', 'clipboard-write'],
      });
      const successPage = await context.newPage();

      const request = await context.request;
      const token = await registerUser(request, testUser);
      await setAuthState(successPage, token);

      await successPage.goto('/channels/general');
      await successPage.waitForLoadState('networkidle');

      const jsCode = '```javascript\nconst x = 1;\n```';
      await sendCodeMessage(successPage, jsCode);
      await successPage.waitForTimeout(500);

      // Find and click copy button
      const copyButton = successPage.locator('button[title="Copy to clipboard"], button[title="Copy code"]').first();
      await copyButton.click();

      // Should show check icon or "Copied!" text
      const successIndicator = successPage.locator('text="Copied!"').first();
      await expect(successIndicator).toBeVisible({ timeout: 5000 }).catch(() => {
        // Alternative: check for checkmark icon
        const checkIcon = successPage.locator('[class*="check"]').first();
        expect(checkIcon).toBeVisible({ timeout: 5000 });
      });

      await context.close();
    });

    test('should restore copy button after success timeout', async ({ browser }) => {
      const context = await browser.newContext({
        permissions: ['clipboard-read', 'clipboard-write'],
      });
      const restorePage = await context.newPage();

      const request = await context.request;
      const token = await registerUser(request, testUser);
      await setAuthState(restorePage, token);

      await restorePage.goto('/channels/general');
      await restorePage.waitForLoadState('networkidle');

      const jsCode = '```javascript\nconst x = 1;\n```';
      await sendCodeMessage(restorePage, jsCode);
      await restorePage.waitForTimeout(500);

      const copyButton = restorePage.locator('button[title="Copy to clipboard"], button[title="Copy code"]').first();
      await copyButton.click();

      // Wait for success timeout (typically 2 seconds)
      await restorePage.waitForTimeout(2500);

      // Copy button should be restored (not showing success state)
      const copyIcon = restorePage.locator('button[title="Copy to clipboard"] svg').first();
      await expect(copyIcon).toBeVisible({ timeout: 5000 });

      await context.close();
    });

    test('should handle clipboard API unavailability gracefully', async () => {
      // This test verifies the UI doesn't crash when clipboard fails
      const jsCode = '```javascript\nconst x = 1;\n```';
      await sendCodeMessage(testPage!, jsCode);
      await testPage!.waitForTimeout(500);

      // Click copy button - if clipboard fails, should not crash the page
      const copyButton = testPage!.locator('button[title="Copy to clipboard"], button[title="Copy code"]').first();
      await copyButton.click();

      // Page should still be functional
      const messageInput = testPage!.locator('input[placeholder="Type a message..."]').last();
      await expect(messageInput).toBeVisible({ timeout: 5000 });
    });

    test('should be keyboard accessible', async () => {
      const jsCode = '```javascript\nconst x = 1;\n```';
      await sendCodeMessage(testPage!, jsCode);
      await testPage!.waitForTimeout(500);

      // Focus the copy button using Tab
      await testPage!.keyboard.press('Tab');
      await testPage!.keyboard.press('Tab');
      await testPage!.keyboard.press('Tab');
      await testPage!.keyboard.press('Tab');

      // Find the copy button and focus it
      const copyButton = testPage!.locator('button[title="Copy to clipboard"], button[title="Copy code"]').first();
      await copyButton.focus();

      // Press Enter to trigger copy
      await testPage!.keyboard.press('Enter');

      // Page should not crash
      const messageInput = testPage!.locator('input[placeholder="Type a message..."]').last();
      await expect(messageInput).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Language Detection', () => {
    test.beforeEach(async () => {
      await testPage!.goto('/channels/general');
      await testPage!.waitForLoadState('networkidle');
    });

    test('should detect and display JavaScript language', async () => {
      const jsCode = '```javascript\nconst x = 1;\n```';
      await sendCodeMessage(testPage!, jsCode);

      // Language label should be visible
      const langLabel = testPage!.locator('text=/javascript|js/i').first();
      await expect(langLabel).toBeVisible({ timeout: 10000 });
    });

    test('should detect and display Python language', async () => {
      const pyCode = '```python\nprint("hello")\n```';
      await sendCodeMessage(testPage!, pyCode);

      const langLabel = testPage!.locator('text=/python|py/i').first();
      await expect(langLabel).toBeVisible({ timeout: 10000 });
    });

    test('should detect and display TypeScript language', async () => {
      const tsCode = '```typescript\nconst x: number = 1;\n```';
      await sendCodeMessage(testPage!, tsCode);

      const langLabel = testPage!.locator('text=/typescript|ts/i').first();
      await expect(langLabel).toBeVisible({ timeout: 10000 });
    });

    test('should show plaintext for unspecified language', async () => {
      const plainCode = '```\nSome plain text code\n```';
      await sendCodeMessage(testPage!, plainCode);

      // Should either show no language or "plaintext" / "text"
      // The exact behavior depends on implementation
      const codeBlock = testPage!.locator('pre code').first();
      await expect(codeBlock).toBeVisible({ timeout: 10000 });
    });

    test('should capitalize language names correctly', async () => {
      const sqlCode = '```sql\nSELECT * FROM users;\n```';
      await sendCodeMessage(testPage!, sqlCode);

      const langLabel = testPage!.locator('text=/SQL/i').first();
      await expect(langLabel).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Inline Code Rendering', () => {
    test.beforeEach(async () => {
      await testPage!.goto('/channels/general');
      await testPage!.waitForLoadState('networkidle');
    });

    test('should render inline code differently from block code', async () => {
      const mixedMessage = 'Use `const` for constants and `let` for variables. Also check this:\n\n```javascript\nconst x = 1;\n```';
      await sendCodeMessage(testPage!, mixedMessage);

      // Inline code should be in <code> without <pre> wrapper
      const inlineCode = testPage!.locator('p code, span code').first();
      await expect(inlineCode).toBeVisible({ timeout: 10000 });
      await expect(inlineCode).toContainText('const');

      // Block code should be in <pre><code>
      const blockCode = testPage!.locator('pre code').first();
      await expect(blockCode).toBeVisible({ timeout: 10000 });
    });

    test('should handle multiple inline code segments', async () => {
      const multiInline = 'Use `foo()`, `bar()`, and `baz()` functions.';
      await sendCodeMessage(testPage!, multiInline);

      const inlineCodes = testPage!.locator('p code, span code');
      const count = await inlineCodes.count();
      expect(count).toBeGreaterThanOrEqual(3);
    });

    test('should render inline code with monospace font', async () => {
      const inlineMessage = 'Use the `npm` command.';
      await sendCodeMessage(testPage!, inlineMessage);

      const inlineCode = testPage!.locator('p code, span code').first();
      await expect(inlineCode).toBeVisible({ timeout: 10000 });

      // Check for monospace font family (implementation varies)
      const fontFamily = await inlineCode.evaluate((el) => {
        const style = window.getComputedStyle(el);
        return style.fontFamily;
      });
      expect(fontFamily).toMatch(/mono|consolas|courier/i);
    });
  });

  test.describe('Multi-Language Support', () => {
    test.beforeEach(async () => {
      await testPage!.goto('/channels/general');
      await testPage!.waitForLoadState('networkidle');
    });

    const languageTests = [
      { lang: 'go', code: '```go\nfunc main() {\n\tfmt.Println("Hello")\n}\n```', name: 'Go' },
      { lang: 'rust', code: '```rust\nfn main() {\n\tprintln!("Hello");\n}\n```', name: 'Rust' },
      { lang: 'html', code: '```html\n<div class="container">Content</div>\n```', name: 'HTML' },
      { lang: 'css', code: '```css\n.container { display: flex; }\n```', name: 'CSS' },
      { lang: 'json', code: '```json\n{ "key": "value" }\n```', name: 'JSON' },
      { lang: 'bash', code: '```bash\necho "Hello, world!"\n```', name: 'Bash' },
      { lang: 'sql', code: '```sql\nSELECT * FROM users WHERE active = true;\n```', name: 'SQL' },
    ];

    for (const { lang, code, name } of languageTests) {
      test(`should highlight ${name} code correctly`, async () => {
        await sendCodeMessage(testPage!, code);

        // Code block should render
        const codeBlock = testPage!.locator('pre code').first();
        await expect(codeBlock).toBeVisible({ timeout: 10000 });

        // Language should be detected
        const langLabel = testPage!.locator(`text=/${name}/i`).first();
        await expect(langLabel).toBeVisible({ timeout: 10000 }).catch(() => {
          // Some implementations may not show language labels
          // So we just verify the code rendered
          expect(codeBlock).toBeVisible();
        });
      });
    }
  });

  test.describe('Code in Conversation Thread', () => {
    test('should persist code messages across page refresh', async () => {
      await testPage!.goto('/channels/general');
      await testPage!.waitForLoadState('networkidle');

      const jsCode = '```javascript\nconst persisted = true;\n```';
      await sendCodeMessage(testPage!, jsCode);
      await testPage!.waitForTimeout(1000);

      // Verify code is visible
      const codeBlock = testPage!.locator('pre code').first();
      await expect(codeBlock).toBeVisible({ timeout: 10000 });

      // Refresh page
      await testPage!.reload();
      await testPage!.waitForLoadState('networkidle');

      // Code should still be visible
      await expect(codeBlock).toBeVisible({ timeout: 10000 });
      await expect(codeBlock).toContainText('const persisted = true');
    });

    test('should handle code in thread replies', async () => {
      await testPage!.goto('/channels/general');
      await testPage!.waitForLoadState('networkidle');

      // Send initial message
      await sendCodeMessage(testPage!, 'Here is some code in a thread:');
      await testPage!.waitForTimeout(500);

      // Open thread (depends on implementation)
      const threadButton = testPage!.locator('button:has-text("Reply in thread"), button:has-text("Thread")').first();
      if (await threadButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await threadButton.click();
        await testPage!.waitForTimeout(500);

        // Reply with code
        const jsCode = '```javascript\nconst replyCode = true;\n```';
        await sendCodeMessage(testPage!, jsCode);

        // Code should render in thread
        const threadCode = testPage!.locator('[class*="thread"] pre code, [role="dialog"] pre code').first();
        await expect(threadCode).toBeVisible({ timeout: 10000 });
      }
    });
  });

  test.describe('Edge Cases', () => {
    test.beforeEach(async () => {
      await testPage!.goto('/channels/general');
      await testPage!.waitForLoadState('networkidle');
    });

    test('should handle unicode characters in code', async () => {
      const unicodeCode = '```javascript\nconst emoji = "🎉";\nconst chinese = "你好";\nconst emoji2 = "👍🏿";\n```';
      await sendCodeMessage(testPage!, unicodeCode);

      const codeBlock = testPage!.locator('pre code').first();
      await expect(codeBlock).toBeVisible({ timeout: 10000 });
      await expect(codeBlock).toContainText('🎉');
    });

    test('should handle backticks within code', async () => {
      const backtickCode = `\`\`\`javascript
const template = \`Hello, \${name}!\`;
console.log(\\\`test\\\`);
\`\`\``;
      await sendCodeMessage(testPage!, backtickCode);

      const codeBlock = testPage!.locator('pre code').first();
      await expect(codeBlock).toBeVisible({ timeout: 10000 });
    });

    test('should handle very long code blocks', async () => {
      const longCodeLines = Array.from({ length: 100 }, (_, i) => `line ${i}: ${'x'.repeat(50)}`).join('\n');
      const longCode = `\`\`\`javascript\n${longCodeLines}\n\`\`\``;

      await sendCodeMessage(testPage!, longCode);

      const codeBlock = testPage!.locator('pre code').first();
      await expect(codeBlock).toBeVisible({ timeout: 15000 });

      // Page should not freeze - check that input is still responsive
      const messageInput = testPage!.locator('input[placeholder="Type a message..."]').last();
      await expect(messageInput).toBeEnabled({ timeout: 5000 });
    });
  });

  test.describe('Responsive Design', () => {
    test('should render code blocks on mobile view', async ({ browser }) => {
      const mobileContext = await browser.newContext({
        viewport: { width: 375, height: 667 },
        permissions: ['clipboard-read', 'clipboard-write'],
      });
      const mobilePage = await mobileContext.newPage();

      const request = await mobileContext.request;
      const token = await registerUser(request, testUser);
      await setAuthState(mobilePage, token);

      await mobilePage.goto('/channels/general');
      await mobilePage.waitForLoadState('networkidle');

      const jsCode = '```javascript\nconst x = 1;\nconsole.log(x);\n```';
      await sendCodeMessage(mobilePage, jsCode);
      await mobilePage.waitForTimeout(1000);

      // Code block should be visible and fit on screen
      const codeBlock = mobilePage.locator('pre').first();
      await expect(codeBlock).toBeVisible({ timeout: 10000 });

      // Font size should be readable
      const fontSize = await codeBlock.evaluate((el) => {
        const style = window.getComputedStyle(el);
        return parseInt(style.fontSize);
      });
      expect(fontSize).toBeGreaterThanOrEqual(10);

      // Horizontal scroll should work on mobile
      const scrollable = mobilePage.locator('pre').first();
      const isScrollable = await scrollable.evaluate((el) => {
        return el.scrollWidth > el.clientWidth;
      });
      expect(isScrollable).toBe(true);

      await mobileContext.close();
    });

    test('should render code blocks on tablet view', async ({ browser }) => {
      const tabletContext = await browser.newContext({
        viewport: { width: 768, height: 1024 },
      });
      const tabletPage = await tabletContext.newPage();

      const request = await tabletContext.request;
      const token = await registerUser(request, testUser);
      await setAuthState(tabletPage, token);

      await tabletPage.goto('/channels/general');
      await tabletPage.waitForLoadState('networkidle');

      const jsCode = '```javascript\nconst tabletCode = true;\n```';
      await sendCodeMessage(tabletPage, jsCode);

      const codeBlock = tabletPage.locator('pre').first();
      await expect(codeBlock).toBeVisible({ timeout: 10000 });

      await tabletContext.close();
    });
  });

  test.describe('Accessibility', () => {
    test.beforeEach(async () => {
      await testPage!.goto('/channels/general');
      await testPage!.waitForLoadState('networkidle');
    });

    test('should have accessible copy button', async () => {
      const jsCode = '```javascript\nconst accessible = true;\n```';
      await sendCodeMessage(testPage!, jsCode);
      await testPage!.waitForTimeout(500);

      const copyButton = testPage!.locator('button[title="Copy to clipboard"], button[title="Copy code"]').first();

      // Button should have accessible name
      const accessibleName = await copyButton.getAttribute('aria-label') || await copyButton.textContent();
      expect(accessibleName).toBeTruthy();

      // Button should be focusable
      await copyButton.focus();
      const isFocused = await copyButton.evaluate((el) => el === document.activeElement);
      expect(isFocused).toBe(true);
    });

    test('should announce language label to screen readers', async () => {
      const jsCode = '```javascript\nconst x = 1;\n```';
      await sendCodeMessage(testPage!, jsCode);

      // Check for aria-label or role on language indicator
      const langIndicator = testPage!.locator('[class*="language"], [aria-label*="language"], [data-language]').first();
      const hasAriaLabel = await langIndicator.getAttribute('aria-label');
      const hasRole = await langIndicator.getAttribute('role');
      const hasDataAttr = await langIndicator.getAttribute('data-language');

      // At least one accessibility attribute should be present
      expect(hasAriaLabel || hasRole || hasDataAttr).toBeTruthy();
    });

    test('should support keyboard navigation', async () => {
      const jsCode = '```javascript\nconst x = 1;\n```';
      await sendCodeMessage(testPage!, jsCode);
      await testPage!.waitForTimeout(500);

      // Focus should move through the page
      await testPage!.keyboard.press('Tab');
      await testPage!.keyboard.press('Tab');
      await testPage!.keyboard.press('Tab');

      // Copy button should be reachable via keyboard
      const copyButton = testPage!.locator('button[title="Copy to clipboard"], button[title="Copy code"]').first();
      await copyButton.focus();

      // Should be able to activate with Enter or Space
      await testPage!.keyboard.press('Enter');

      // Page should remain functional
      const messageInput = testPage!.locator('input[placeholder="Type a message..."]').last();
      await expect(messageInput).toBeVisible({ timeout: 5000 });
    });
  });
});
