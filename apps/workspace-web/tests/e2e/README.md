# Frontend E2E Tests

This directory contains end-to-end tests for the workspace frontend application using Playwright.

## Test Structure

```
tests/e2e/
├── fixtures/
│   └── auth.ts          # Authentication fixtures for shared test setup
├── setup.ts             # Global test setup (waits for API server)
├── login.spec.ts        # Login flow tests
├── navigation.spec.ts   # Navigation and auth redirect tests
├── register.spec.ts     # Register flow tests
├── channels.spec.ts     # Channel list and messaging tests
└── directMessages.spec.ts # Direct message tests
```

## Running Tests

### Prerequisites

1. Install dependencies:
   ```bash
   cd client
   npm install
   ```

2. Install Playwright browsers:
   ```bash
   npx playwright install
   ```

### Run All E2E Tests

```bash
npm run test:e2e
```

### Run Tests with UI Mode

```bash
npm run test:e2e:ui
```

### Run Tests in Headed Mode (see browser)

```bash
npm run test:e2e:headed
```

### Run Tests with Debug Mode

```bash
npm run test:e2e:debug
```

### View Test Report

```bash
npm run test:e2e:report
```

### Run Specific Test File

```bash
npx playwright test tests/e2e/login.spec.ts
```

### Run Tests on Specific Browser

```bash
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit
```

## Test Coverage

### Register Flow Tests (`register.spec.ts`)

- ✅ Register with valid credentials
- ✅ Register with invalid email format
- ✅ Register with password too short
- ✅ Register with password mismatch
- ✅ Register with missing name
- ✅ Register with missing email
- ✅ Register with missing password
- ✅ Register with existing email (should fail)
- ✅ Navigate from register to login

### Login Flow Tests (`login.spec.ts`)

- ✅ Login with correct credentials
- ✅ Login with wrong password
- ✅ Login with non-existent email
- ✅ Login with missing email
- ✅ Login with missing password
- ✅ Login with invalid email format
- ✅ Navigate from login to register
- ✅ Redirect authenticated user to channels

### Navigation Tests (`navigation.spec.ts`)

- ✅ Navigate from login to register
- ✅ Navigate from register to login
- ✅ Redirect to login when accessing protected route
- ✅ Redirect authenticated user from login to channels
- ✅ Redirect authenticated user from register to channels

### Channel Tests (`channels.spec.ts`)

- ✅ Display channels sidebar with workspace header
- ✅ Display channels section with list of channels
- ✅ Navigate to specific channel when clicked
- ✅ Show channel header when viewing a channel
- ✅ Display message list area when viewing channel
- ✅ Have message input field
- ✅ Send a message to channel
- ✅ Display sent message in message list

### Direct Message Tests (`directMessages.spec.ts`)

- ✅ Display direct messages page
- ✅ Have search people input
- ✅ Display user list for direct messages
- ✅ Navigate to DM conversation when clicking on user
- ✅ Display DM header with user name
- ✅ Have message input in DM conversation
- ✅ Send a direct message
- ✅ Have back link to messages list
- ✅ Display user avatar with status

## Technical Details

- **Framework**: Playwright
- **Browser Support**: Chromium, Firefox, WebKit (Safari)
- **API Testing**: Uses Playwright's API request context for setup
- **Authentication**: Token stored in localStorage
