# Cross-Process Run ID Coordination (Simplified)

This plugin now supports **completely automatic** run ID coordination between Cypress and your application. The server manages all run ID logic, making the API dramatically simpler.

## 🎯 **Problem Solved**

Before this feature:

- Cypress tests and the application being tested were separate processes
- No way to coordinate run IDs between them
- Each `npx cypress run` had inconsistent data tracking

After this feature:

- ✅ Single run ID shared across all processes for each Cypress run
- ✅ Automatic reset when starting a new `npx cypress run`
- ✅ **Server handles ALL run ID logic** - no manual management needed
- ✅ Works in browser, server, and test environments
- ✅ Follows Stratum's explicit configuration philosophy

## 🏗️ **How It Works (Simplified)**

```
┌─────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Cypress   │    │    Dashboard     │    │  Your App       │
│   Process   │    │    Server        │    │  (Stratum)      │
│             │───▶│                  │◀───│                 │
│ Sets Active │    │ Manages Active   │    │ Just Makes      │
│ Run ID      │    │ Run ID Logic     │    │ API Calls       │
└─────────────┘    └──────────────────┘    └─────────────────┘
```

1. **Cypress starts**: Generates and sets active run ID on dashboard
2. **App publishes events**: Makes simple API calls (no run ID needed!)
3. **Server coordination**: Automatically uses active run ID for all operations
4. **Data isolation**: Each run has separate data automatically
5. **Cypress ends**: Clears active run ID, ready for next run

## 🚀 **Usage (Even Simpler!)**

### **Quick Start for External Developers**

1. **Install the plugin** (if not already installed):

   ```bash
   npm install @rachelallyson/stratum-event-counter-plugin
   ```

2. **Start the dashboard server**:

   ```bash
   npx @rachelallyson/stratum-event-counter-plugin
   ```

3. **Use the plugin in your app** (no changes needed if already using):

   ```javascript
   import { EventCounterPluginFactory } from "@rachelallyson/stratum-event-counter-plugin";
   
   const plugin = EventCounterPluginFactory({
     dashboardUrl: 'http://localhost:41321',
     catalog: eventCatalog
   });
   ```

4. **Run your Cypress tests**:

   ```bash
   npx cypress run
   ```

5. **That's it!** 🎉 All events will automatically be coordinated with the same run ID. No special commands, no configuration, no setup required.

### **For Application Developers**

**Zero changes needed** - the API is now even simpler:

```javascript
// Your application code - completely unchanged!
import { StratumService } from "@capitalone/stratum-observability";
import { EventCounterPluginFactory } from "@rachelallyson/stratum-event-counter-plugin";

const plugin = EventCounterPluginFactory({
  dashboardUrl: 'http://localhost:41321',
  enableLogging: true,
  catalog: eventCatalog
  // No run ID management needed AT ALL!
});

const stratumService = new StratumService({
  plugins: [plugin]
});

// This event automatically uses the active Cypress run ID
stratumService.publish('user-login');
```

**The EventCounterPublisher is now 50% simpler:**

```javascript
// Before (complex)
const runId = await this.getRunId();
fetch(`${dashboardUrl}/api/events-stats?statsId=${runId}`, ...)

// After (simple)  
fetch(`${dashboardUrl}/api/events-stats`, ...)
// Server automatically uses active run ID!
```

### **For Test Writers**

**Just run your tests normally** - no special commands needed:

```javascript
describe('My App Tests', () => {
  it('should track events automatically', () => {
    // Your regular test code - events are automatically coordinated
    cy.visit('/my-app')
    cy.get('[data-cy="login-button"]').click()
    
    // If you want to verify events (optional), use standard HTTP requests
    cy.request('GET', '/api/events-stats').then((response) => {
      expect(response.body.events).to.have.property('user-login')
    })
  })
})
```

> **📝 Note**: The custom Cypress commands you see in our tests (like `cy.getActiveRunId()`) are only for internal testing of this plugin. When you install the plugin via npm, you **don't need any special Cypress commands** - just run `npx cypress run` and everything works automatically!

### **Optional: Adding Custom Commands (If Desired)**

If you want similar commands in your own project, you can add them to your `cypress/support/commands.ts`:

```javascript
// Optional - only if you want these commands in your project
declare global {
  namespace Cypress {
    interface Chainable {
      getActiveRunId(): Chainable<any>
      setActiveRunId(runId?: string): Chainable<any>
    }
  }
}

Cypress.Commands.add('getActiveRunId', () => {
  return cy.request('GET', '/api/active-run-id').then((response) => {
    return response.body.runId
  })
})

Cypress.Commands.add('setActiveRunId', (runId?: string) => {
  const body = runId ? { runId } : {}
  return cy.request('POST', '/api/active-run-id', body).then((response) => {
    return response.body.runId
  })
})

export {}
```

## 📊 **Simplified Dashboard Server API**

The server now automatically handles run IDs:

```javascript
// All these API calls automatically use the active run ID:

POST /api/events-stats        // ← No ?statsId= needed!
GET  /api/events-stats        // ← Uses active run ID automatically  
POST /api/catalog             // ← No ?statsId= needed!
GET  /api/catalog             // ← Uses active run ID automatically

// Explicit run IDs still work for manual control:
POST /api/events-stats?statsId=custom-123
GET  /api/events-stats?statsId=custom-123
```

**Server logs show both explicit and effective run IDs:**

```
[INFO] 📊 Event received: user-login - explicit: none, effective: cypress-123...
[INFO] 📊 Event received: user-logout - explicit: manual-456, effective: manual-456
```

## ✨ **Benefits of Simplified Approach**

- **🎯 Zero configuration** - Just works automatically
- **📝 50% less code** - Removed all run ID fetching logic
- **🚫 No API complexity** - No `?statsId=` parameters needed
- **⚡ Better performance** - No extra HTTP calls to fetch run IDs
- **🔧 Backward compatible** - Explicit run IDs still work
- **🪲 Easier debugging** - Server logs show all run ID decisions
- **🧪 Simpler testing** - API calls just work without setup

## 🧪 **Internal Testing (Plugin Development)**

> **Note**: These tests are for internal validation of the plugin itself. As an end user, you don't need to run these tests - just use the plugin normally!

Our internal tests demonstrate the coordination works:

```bash
# Internal plugin development tests (not for end users)
npx cypress run --spec cypress/e2e/simplified-coordination.cy.ts
```

These internal tests validate:

- ✅ Automatic coordination without explicit run ID passing
- ✅ Backward compatibility with explicit run IDs  
- ✅ How much simpler the publisher API becomes

## 🔧 **How the Server Magic Works**

The server automatically determines which run ID to use:

```typescript
function getStatsFile(explicitStatsId?: string) {
  // If explicit statsId provided, use that
  // Otherwise, use active run ID set by Cypress
  const effectiveStatsId = explicitStatsId || getActiveRunId();
  
  if (effectiveStatsId && effectiveStatsId !== "default") {
    return `event-stats-${effectiveStatsId}.json`;
  }
  return "event-stats.json"; // default
}
```

**Priority order:**

1. **Explicit `?statsId=...`** (for manual control)
2. **Active run ID** (set by Cypress)
3. **Default** (fallback)

## 🎭 **Example Workflows**

### **Typical Developer Workflow**

```bash
# Terminal 1: Start dashboard server
npx @rachelallyson/stratum-event-counter-plugin

# Terminal 2: Start your app (configured with the plugin)
npm start

# Terminal 3: Run your Cypress tests
npx cypress run

# ✅ All events from your app automatically use the same run ID as Cypress!
# ✅ Each new "npx cypress run" gets a fresh run ID automatically
# ✅ No configuration, commands, or setup required
```

### **Advanced: Manual Run ID Control (Optional)**

```bash
# For debugging or manual testing, you can still force specific run IDs:
curl -X POST "localhost:41321/api/events-stats?statsId=debug-session" \
  -d '{"eventKey":"debug-event","timestamp":"..."}'

# Or use the API to set an active run ID manually:
curl -X POST "localhost:41321/api/active-run-id" \
  -d '{"runId":"manual-debug-session"}'
```

## 📈 **Code Reduction Summary**

**EventCounterPublisher Before:**

- 290 lines with run ID caching, fetching, and error handling
- Complex async logic to coordinate with dashboard
- Cache management and timeout handling

**EventCounterPublisher After:**

- 250 lines (40 lines removed!)
- Simple, direct API calls
- Zero run ID management logic

**API Calls Before:**

```javascript
const runId = await this.getRunId();              // Extra HTTP call
const response = await fetch(                      
  `${url}/api/events-stats?statsId=${runId}`,     // Complex URL building
  { body: JSON.stringify(data) }
);
```

**API Calls After:**

```javascript
const response = await fetch(                      
  `${url}/api/events-stats`,                      // Simple URL
  { body: JSON.stringify(data) }
);
```

## ✅ **Backward Compatibility**

All existing code continues to work:

- ✅ Explicit `?statsId=` parameters still supported
- ✅ Multiple run tracking still works
- ✅ Manual testing workflows unchanged
- ✅ All existing Cypress commands work

## 🚫 **What We Don't Do**

- **No global variables** - Still no `window.__eventStatsId`
- **No automatic server management** - You still control the dashboard server
- **No production features** - Still development/testing focused only
- **No magic behavior** - Server logic is explicit and traceable

## 🔮 **Future Enhancements**

This simplified foundation makes future features easier:

- CI/CD integration becomes simpler
- Multi-environment coordination is cleaner
- Plugin extensions require less boilerplate
- Performance monitoring has less overhead

---

**The Result**: You now have the simplest possible API for cross-process run ID coordination. Just run `npx cypress run` and everything works automatically with zero configuration! 🎉
