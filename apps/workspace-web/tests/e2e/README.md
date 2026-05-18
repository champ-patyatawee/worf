# Frontend E2E Tests

This directory contains end-to-end tests for the workspace frontend application using Playwright.

## Test Structure

```
tests/e2e/
├── fixtures/
│   └── auth.ts              # Authentication fixtures for shared test setup
├── setup.ts                 # Global test setup (waits for API + frontend)
├── login.spec.ts            # Login flow tests (basic + admin login)
├── register.spec.ts         # Register flow tests
├── channels.spec.ts         # Channel list, navigation, and messaging tests
├── channels-realtime.spec.ts # Multi-user real-time socket.io messaging tests
└── admin-settings.spec.ts   # Admin-only settings pages tests
```

## Running Tests

### Locally (requires running infra)

```bash
# Start the dev environment
docker compose -f docker-compose.dev.yml up -d

# Run all e2e tests
npm run test:e2e

# Specific test file
npx playwright test tests/e2e/login.spec.ts

# Run with UI mode
npm run test:e2e:ui

# Run in headed mode (see browser)
npm run test:e2e:headed

# Run with debug mode
npm run test:e2e:debug

# View test report
npm run test:e2e:report
```

### In Docker (recommended for CI / isolated runs)

All infrastructure + the test runner run inside Docker containers via `docker-compose.e2e.yml`:

```bash
# 1. Start all services (postgres, redis, auth, APIs, frontend)
docker compose -f docker-compose.e2e.yml up -d

# 2. Run all Playwright tests
docker compose -f docker-compose.e2e.yml run --rm playwright

# 3. Run a specific test file
docker compose -f docker-compose.e2e.yml run --rm playwright \
  npx playwright test --reporter=list tests/e2e/login.spec.ts

# 4. Run tests matching a grep pattern (e.g. "Login Flow")
docker compose -f docker-compose.e2e.yml run --rm playwright \
  npx playwright test --reporter=list --grep="Login Flow"

# 5. Run admin settings tests
docker compose -f docker-compose.e2e.yml run --rm playwright \
  npx playwright test --reporter=list tests/e2e/admin-settings.spec.ts

# 6. Run realtime multi-user messaging test
docker compose -f docker-compose.e2e.yml run --rm playwright \
  npx playwright test --reporter=list tests/e2e/channels-realtime.spec.ts

# 7. Run API e2e tests (server-side Jest tests)
docker compose -f docker-compose.e2e.yml run --rm api-tests

# 8. Clean up everything (including volumes)
docker compose -f docker-compose.e2e.yml down -v

# Full workflow: clean start → run tests → cleanup
docker compose -f docker-compose.e2e.yml down -v && \
  docker compose -f docker-compose.e2e.yml up -d && \
  docker compose -f docker-compose.e2e.yml run --rm playwright && \
  docker compose -f docker-compose.e2e.yml down -v
```

> **Note:** The Playwright Docker image version must match the local `@playwright/test` version. The compose file uses `mcr.microsoft.com/playwright:v1.58.2-jammy` — update the tag to match your local version if needed.

### Run API Tests Only

```bash
docker compose -f docker-compose.e2e.yml run --rm api-tests
```

## Test Coverage

### Register Flow Tests (`register.spec.ts`)

- ✅ Register with valid credentials
- ✅ Show validation error for missing name
- ✅ Show validation error for password mismatch
- ✅ Show validation error for missing email
- ✅ Show validation error for invalid email
- ✅ Show validation error for missing password
- ✅ Show validation error for password too short
- ✅ Show validation error for missing confirm password
- ✅ Navigate from register page back to login

### Login Flow Tests (`login.spec.ts`)

- ✅ Show validation error for missing email
- ✅ Show validation error for missing password
- ✅ Prevent form submission with browser native email validation
- ✅ Navigate to register page
- ✅ Show login form with all fields
- ✅ Login as admin with seeded credentials (admin@worf.dev)
- ✅ Login successfully with valid credentials
- ✅ Show error for invalid password
- ✅ Show error for non-existent email

### Admin Settings Tests (`admin-settings.spec.ts`)

- ✅ Access settings page as admin
- ✅ See AI Providers page with heading and empty state
- ✅ Navigate between settings tabs (AI Provider → Prompt Templates → Tools → Note LLM)

### Channel Tests (`channels.spec.ts`)

- ✅ Display channels page after login with message input
- ✅ Display general channel content
- ✅ Navigate to general channel
- ✅ Navigate to /channels/general without 401 errors
- ✅ Have message input field on general channel
- ✅ Send a message to general channel
- ✅ Display sent message in message list

### Realtime Multi-User Messaging (`channels-realtime.spec.ts`)

- ✅ 3 users (Alice, Bob, Admin) in the same channel
- ✅ Each user has an isolated browser session with its own auth + socket.io connection
- ✅ Alice sends a message → Bob and Admin see it in real-time
- ✅ Bob sends a message → Alice and Admin see it in real-time
- ✅ Admin sends a message → Alice and Bob see it in real-time
- ✅ Validates socket.io WebSocket broadcasting works end-to-end

## Technical Details

- **Framework**: Playwright
- **Browser Support**: Chromium, Firefox, WebKit (Safari)
- **API Testing**: Uses Playwright's API request context for setup
- **Authentication**: Token stored in localStorage via zustand persist middleware
- **Real-time**: Tests use multiple isolated browser contexts with separate socket.io connections to validate WebSocket message broadcasting
- **Docker**: All services (postgres, redis, auth-service, workspace-api, note-api, kanban-api, client) run in Docker containers
- **Seeded admin user**: `admin@worf.dev` / `123456` (created by `services/workspace-api/prisma/seed.ts`)
