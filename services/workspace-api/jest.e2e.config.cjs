const { config } = require('dotenv');

// Load test environment variables before anything else
// This must happen at the top level, not in a function
const path = require('path');

// Find .env.test or .env in the server directory
const testEnvPath = path.resolve(__dirname, '.env.test');
const envPath = path.resolve(__dirname, '.env');

try {
  require('fs').accessSync(testEnvPath);
  config({ path: testEnvPath });
} catch {
  try {
    require('fs').accessSync(envPath);
    config({ path: envPath });
  } catch {
    // No env file found, rely on environment variables
  }
}

// Now set critical env vars for e2e tests if not already set
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'postgresql://workspace:workspace_dev@postgres-test:5432/workspace_test';
}
if (!process.env.TEST_DATABASE_URL) {
  process.env.TEST_DATABASE_URL = 'postgresql://workspace:workspace_dev@postgres-test:5432/workspace_test';
}
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'test-secret-key-for-e2e-tests';
}
process.env.NODE_ENV = 'test';

/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.e2e.test.ts'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      useESM: true,
      tsconfig: {
        module: 'ESNext',
        moduleResolution: 'NodeNext',
        target: 'ES2022',
        esModuleInterop: true,
      },
    }],
  },
  extensionsToTreatAsEsm: ['.ts'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  testTimeout: 30000,
  setupFilesAfterEnv: ['<rootDir>/tests/e2e-setup.ts'],
};