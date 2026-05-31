import { test as base, Page, APIRequestContext } from '@playwright/test';

interface TestUser {
  email: string;
  password: string;
  name: string;
}

export interface AuthFixtures {
  testUser: TestUser;
  registerUser: (user?: Partial<TestUser>) => Promise<TestUser>;
  loginUser: (user: TestUser) => Promise<string>;
  authenticatedUser: TestUser;
  loginAsUser: (page: Page, user: TestUser) => Promise<void>;
}

async function loginViaApi(request: APIRequestContext, user: TestUser): Promise<{ token: string; userId: string }> {
  const response = await request.post('/ws/api/auth/register', {
    data: user,
  });

  if (response.ok()) {
    // User was registered successfully (new user)
    const body = await response.json();
    return { token: body.data?.token || body.token, userId: body.data?.user?.id || body.user?.id };
  }

  // If registration fails (user exists), try logging in
  const loginResponse = await request.post('/ws/api/auth/login', {
    data: {
      email: user.email,
      password: user.password,
    },
  });

  if (!loginResponse.ok()) {
    throw new Error(`Failed to authenticate user: ${loginResponse.status()}`);
  }

  const loginBody = await loginResponse.json();
  return { token: loginBody.data?.token || loginBody.token, userId: loginBody.data?.user?.id || loginBody.user?.id };
}

export const test = base.extend<AuthFixtures>({
  testUser: async ({}, use) => {
    await use({
      email: `testuser_${Date.now()}@example.com`,
      password: 'SecurePass123!',
      name: 'Test User',
    });
  },

  registerUser: async ({ request }, use) => {
    await use(async (user?: Partial<TestUser>) => {
      const newUser: TestUser = {
        email: `user_${Date.now()}@example.com`,
        password: 'SecurePass123!',
        name: 'Test User',
        ...user,
      };

      const response = await request.post('/ws/api/auth/register', {
        data: newUser,
      });

      if (!response.ok()) {
        throw new Error(`Failed to register user: ${response.status()}`);
      }

      return newUser;
    });
  },

  loginUser: async ({ request }, use) => {
    await use(async (user: TestUser) => {
      const response = await request.post('/ws/api/auth/login', {
        data: {
          email: user.email,
          password: user.password,
        },
      });

      if (!response.ok()) {
        throw new Error(`Failed to login user: ${response.status()}`);
      }

      const { data } = await response.json();
      return data.token;
    });
  },

  authenticatedUser: async ({}, use) => {
    const user: TestUser = {
      email: `authtest_${Date.now()}@example.com`,
      password: 'SecurePass123!',
      name: 'Auth Test User',
    };
    await use(user);
  },

  loginAsUser: async ({ request }, use) => {
    await use(async (page: Page, user: TestUser) => {
      // First register the user via API
      await request.post('/ws/api/auth/register', {
        data: user,
      });

      // Then login to get the token
      const loginResponse = await request.post('/ws/api/auth/login', {
        data: {
          email: user.email,
          password: user.password,
        },
      });

      if (!loginResponse.ok()) {
        throw new Error(`Failed to login user: ${loginResponse.status()}`);
      }

      const { data } = await loginResponse.json();
      const token = data.token;

      // Set the auth state in localStorage (matching what the app does)
      await page.goto('/login');
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
        token
      );
    });
  },
});

export { expect } from '@playwright/test';
