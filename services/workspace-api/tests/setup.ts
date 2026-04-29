// Global test setup
beforeAll(() => {
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test-secret-key';
  process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://workspace:workspace_dev@localhost:5432/workspace_test';
});

afterAll(async () => {
  // Cleanup after all tests
});