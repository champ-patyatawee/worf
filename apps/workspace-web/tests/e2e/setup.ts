import { beforeAll, afterAll } from '@playwright/test';

/**
 * Global test setup
 * 
 * This file runs before all tests and ensures the backend API
 * and frontend are ready to accept requests.
 */
export default async function globalSetup() {
  const apiUrl = process.env.API_URL || 'http://server:3001';
  const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://client:5173';
  const maxRetries = 30;
  const retryInterval = 1000;

  console.log('Waiting for API server to be ready...');

  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(`${apiUrl}/api/auth/me`, {
        method: 'GET',
      });
      
      // 401 means the server is up (just not authenticated)
      if (response.status === 401 || response.ok) {
        console.log('API server is ready!');
        break;
      }
    } catch {
      // Server not ready yet
    }

    if (i < maxRetries - 1) {
      await new Promise(resolve => setTimeout(resolve, retryInterval));
    }
  }

  console.log('Waiting for frontend to be ready...');

  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(baseURL, { method: 'GET' });
      
      if (response.ok || response.status < 500) {
        console.log('Frontend is ready!');
        return;
      }
    } catch {
      // Frontend not ready yet
    }

    if (i < maxRetries - 1) {
      await new Promise(resolve => setTimeout(resolve, retryInterval));
    }
  }

  throw new Error('Frontend did not become ready in time');
}
