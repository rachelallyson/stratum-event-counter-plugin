# Testing Setup Guide

This guide shows how to set up Stratum Event Counter run ID coordination with any testing framework.

## 🎯 **Quick Start**

The plugin provides test utilities that work with **any testing framework** (Jest, Vitest, Cypress, Playwright, etc.). No configuration files needed!

### **Installation**

```bash
npm install @rachelallyson/stratum-event-counter-plugin
```

**Requirements:**

- Node.js 18+ (for built-in fetch support), OR
- For Node.js < 18: `npm install node-fetch` (automatically used as fallback)

### **Basic Usage**

**For Node.js environments (Jest, Vitest, etc.):**

```javascript
import { startTestRun, endTestRun } from '@rachelallyson/stratum-event-counter-plugin/test-utils';

// Before each test
const runId = await startTestRun();

// After each test  
await endTestRun();
```

**For browser environments (Cypress, Playwright, etc.):**

```javascript
import { startTestRun, endTestRun } from '@rachelallyson/stratum-event-counter-plugin/test-utils-browser';

// Before each test
const runId = await startTestRun();

// After each test  
await endTestRun();
```

That's it! All events from your app will now be coordinated under the same run ID during each test.

## 🔧 **Framework-Specific Examples**

### **Jest / Vitest**

```javascript
// jest.setup.js or vitest.setup.js
import { startTestRun, endTestRun } from '@rachelallyson/stratum-event-counter-plugin/test-utils';

let currentRunId;

beforeEach(async () => {
  currentRunId = await startTestRun({ prefix: 'jest' });
});

afterEach(async () => {
  await endTestRun();
});
```

### **Cypress**

**Option 1: Global Run ID (all tests in `cypress run` share same ID):**

```javascript
// cypress.config.ts - Set run ID once for entire test run
import { defineConfig } from 'cypress';
const { startTestRun, endTestRun } = require('@rachelallyson/stratum-event-counter-plugin/test-utils');

export default defineConfig({
  e2e: {
    setupNodeEvents(on, config) {
      let currentRunId: string | null = null;

      on('before:run', async () => {
        currentRunId = await startTestRun({ prefix: 'cypress' });
      });

      on('after:run', async () => {
        if (currentRunId) {
          await endTestRun();
        }
      });

      return config;
    }
  }
});
```

```javascript
// cypress/e2e/your-tests.cy.ts - Use the global run ID
import { getActiveRunId, resetRunStats } from '@rachelallyson/stratum-event-counter-plugin/test-utils-browser';

describe('My Tests', () => {
  beforeEach(async () => {
    // Optional: Reset stats but keep same run ID
    const runId = await getActiveRunId();
    if (runId) {
      await resetRunStats(runId);
    }
  });

  it('should use global run ID', async () => {
    const runId = await getActiveRunId();
    // All tests use the same run ID
  });
});
```

**Option 2: Individual Run IDs (each test gets its own ID):**

```javascript
// cypress/e2e/your-tests.cy.ts - Each test gets its own run ID
import { startTestRun, endTestRun } from '@rachelallyson/stratum-event-counter-plugin/test-utils-browser';

describe('My Tests', () => {
  beforeEach(() => {
    cy.wrap(startTestRun({ prefix: 'cypress' })).as('runId');
  });

  afterEach(() => {
    cy.wrap(endTestRun());
  });
});
```

### **Playwright**

```javascript
// playwright.config.js
import { test } from '@playwright/test';
import { startTestRun, endTestRun } from '@rachelallyson/stratum-event-counter-plugin/test-utils-browser';

test.beforeEach(async () => {
  await startTestRun({ prefix: 'playwright' });
});

test.afterEach(async () => {
  await endTestRun();
});
```

### **Mocha**

```javascript
// test/setup.js
import { startTestRun, endTestRun } from '@rachelallyson/stratum-event-counter-plugin/test-utils';

beforeEach(async function() {
  this.runId = await startTestRun({ prefix: 'mocha' });
});

afterEach(async function() {
  await endTestRun();
});
```

## 📚 **Available Functions**

### **Simple Functions (Recommended)**

```javascript
// For Node.js environments
import { startTestRun, endTestRun } from '@rachelallyson/stratum-event-counter-plugin/test-utils';

// For browser environments (Cypress, Playwright)
import { startTestRun, endTestRun } from '@rachelallyson/stratum-event-counter-plugin/test-utils-browser';

// Start a new test run (generates ID, sets it active, resets stats)
const runId = await startTestRun({
  prefix: 'my-test',     // Optional: prefix for run ID (default: 'test')
  resetStats: true,      // Optional: reset stats (default: true)
  dashboardUrl: 'http://localhost:41321'  // Optional: dashboard URL
});

// End the test run (clears active run ID)
await endTestRun();
```

### **Manual Functions (Advanced)**

```javascript
// For Node.js environments
import { 
  generateRunId, 
  setActiveRunId, 
  clearActiveRunId,
  getActiveRunId,
  resetRunStats 
} from '@rachelallyson/stratum-event-counter-plugin/test-utils';

// For browser environments (Cypress, Playwright)
import { 
  generateRunId, 
  setActiveRunId, 
  clearActiveRunId,
  getActiveRunId,
  resetRunStats 
} from '@rachelallyson/stratum-event-counter-plugin/test-utils-browser';

// Generate a run ID
const runId = generateRunId('my-prefix');

// Set active run ID (all events without explicit run ID will use this)
await setActiveRunId(runId);

// Get current active run ID
const currentRunId = await getActiveRunId(); // returns string or null

// Reset stats for a run
await resetRunStats(runId);

// Clear active run ID
await clearActiveRunId();
```

## 🏃‍♂️ **How It Works**

1. **Start Dashboard**: Run `npx @rachelallyson/stratum-event-counter-plugin` to start the dashboard server
2. **Set Run ID**: Use `startTestRun()` to set an active run ID on the dashboard
3. **App Events**: Your app publishes events without specifying a run ID
4. **Coordination**: The dashboard automatically assigns events to the active run ID
5. **Clean Up**: Use `endTestRun()` to clear the active run ID after each test

## 🔄 **Event Flow**

```
Test Framework          Dashboard Server          Your App
     │                        │                      │
     │── startTestRun() ──────→│                      │
     │                        │ (sets active run ID) │
     │                        │                      │
     │                        │←─── event published ──│
     │                        │ (uses active run ID) │
     │                        │                      │
     │── endTestRun() ────────→│                      │
     │                        │ (clears active run)  │
```

## 🧪 **Example Test**

```javascript
// Use the appropriate import for your environment:
// For Node.js: from '@rachelallyson/stratum-event-counter-plugin/test-utils'  
// For browsers: from '@rachelallyson/stratum-event-counter-plugin/test-utils-browser'
import { startTestRun, endTestRun, getActiveRunId } from '@rachelallyson/stratum-event-counter-plugin/test-utils';

describe('My App Tests', () => {
  let runId;

  beforeEach(async () => {
    runId = await startTestRun({ prefix: 'my-app' });
  });

  afterEach(async () => {
    await endTestRun();
  });

  it('should track events during test', async () => {
    // Verify run ID is set
    const activeRunId = await getActiveRunId();
    expect(activeRunId).toBe(runId);

    // Your app code that publishes events
    await myApp.doSomething(); // This publishes events

    // Check event stats
    const response = await fetch(`http://localhost:41321/api/events-stats?statsId=${runId}`);
    const stats = await response.json();
    
    expect(stats.totalEvents).toBeGreaterThan(0);
  });
});
```

## 🚫 **What You DON'T Need**

- ❌ No Cypress configuration changes
- ❌ No test runner plugins
- ❌ No environment variables
- ❌ No global setup files
- ❌ No framework-specific configuration

Just import the functions and use them in your tests!

## 🔍 **Troubleshooting**

### **Dashboard Not Running**

```
Error: Could not set active run ID: fetch failed
```

**Solution**: Start the dashboard server first:

```bash
npx @rachelallyson/stratum-event-counter-plugin
```

### **Fetch Not Available**

```
Error: No fetch implementation available
```

**Solution**: Either upgrade to Node.js 18+ or install node-fetch:

```bash
npm install node-fetch
```

### **Events Not Being Tracked**

Make sure your app is publishing events to the correct dashboard URL (default: `http://localhost:41321`).

### **Multiple Test Runners**

Each test runner can use a different prefix to avoid conflicts:

```javascript
// Jest
await startTestRun({ prefix: 'jest' });

// Cypress  
await startTestRun({ prefix: 'cypress' });
```
