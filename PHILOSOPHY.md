# Plugin Philosophy

## 🎯 **Core Design Principles**

This plugin is built around several key philosophical principles that guide its architecture and usage patterns.

### **1. Development-First Design**

This plugin is explicitly designed for **development and testing workflows**, not production deployment. This focus allows us to:

- **Prioritize developer experience** over production optimization
- **Include debugging features** that would be inappropriate in production
- **Provide real-time feedback** during development cycles
- **Enable rapid iteration** and testing workflows

### **2. Clean Separation of Concerns**

The plugin follows a strict separation between different responsibilities:

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Stratum       │    │  Plugin          │    │  Dashboard      │
│   Service       │───▶│  (Event          │───▶│  Server         │
│   (Event        │    │  Counting)       │    │  (API + Files)  │
│   Publishing)   │    │                  │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                              │
                              ▼
                       ┌─────────────────┐
                       │  Dashboard      │
                       │  UI             │
                       │  (Display)      │
                       └─────────────────┘
```

- **Stratum Service**: Handles event publishing and plugin management
- **Plugin**: Handles event counting and run isolation
- **Dashboard Server**: Manages API endpoints and file storage
- **Dashboard UI**: Provides visualization and interaction

### **3. Configuration Over Convention**

The plugin prioritizes explicit configuration over implicit conventions:

```javascript
// Explicit configuration - clear and predictable
const plugin = EventCounterPluginFactory({
  dashboardUrl: 'http://localhost:3000',  // Explicit URL
  enableLogging: true,                    // Explicit logging control
  catalog: eventCatalog                   // Explicit catalog
});
```

This approach:

- **Eliminates magic** - no hidden defaults or implicit behavior
- **Improves debugging** - configuration is visible and traceable
- **Enables flexibility** - different environments can use different configs
- **Reduces confusion** - behavior is predictable and documented

### **4. CLI-First Dashboard Management**

The dashboard server is always started via CLI, never programmatically:

```bash
# Always explicit, never hidden
EVENT_COUNTER_PORT=3000 npx @rachelallyson/stratum-event-counter-plugin
```

This design:

- **Prevents port conflicts** - explicit port management
- **Enables process control** - users control when dashboard starts/stops
- **Supports different environments** - test servers, development servers, etc.
- **Follows Unix philosophy** - single-purpose tools that do one thing well

### **6. Publisher Self-Management**

The publisher manages its own logging and state:

```javascript
// Publisher handles its own concerns
EventCounterPublisher.setLogging(true);  // Static global control
const publisher = new EventCounterPublisher(dashboardUrl);  // Simple constructor
```

This approach:

- **Encapsulates complexity** - publisher manages its own internals
- **Enables global control** - logging affects all publisher instances
- **Simplifies testing** - can control logging state per test
- **Follows single responsibility** - publisher handles publisher concerns

### **7. Per-Run Data Isolation**

Each run stores its own catalog and statistics, enabling proper comparison:

```javascript
// Run 1: Catalog A
const plugin1 = EventCounterPluginFactory({
  catalog: catalogA  // Stored as event-catalog-run-1234567890.json
});

// Run 2: Catalog B  
const plugin2 = EventCounterPluginFactory({
  catalog: catalogB  // Stored as event-catalog-run-1234567891.json
});
```

This design:

- **Enables accurate comparisons** - each run compares against its own catalog
- **Supports catalog evolution** - track how event definitions change over time
- **Facilitates A/B testing** - compare different event schemas
- **Improves debugging** - identify catalog mismatches
- **Cross-environment consistency** - same run ID works in browser and server

## 🏗️ **Architectural Decisions**

### **Why Stratum Integration?**

The plugin integrates with Stratum observability because:

1. **Framework Alignment**: Leverages established Stratum patterns and conventions
2. **Event Flow**: Natural integration with Stratum's event publishing system
3. **Plugin Architecture**: Follows Stratum's plugin-based extensibility model
4. **Consistency**: Provides consistent API with other Stratum plugins

### **Why Unified Run ID Approach?**

The plugin uses a unified `runId` parameter because:

1. **Cross-Environment**: Works in browser, server, and test environments
2. **Explicit Configuration**: No reliance on global variables or implicit state
3. **Stratum Compatibility**: Fits naturally with Stratum's configuration patterns
4. **Testing Integration**: Easy to integrate with Cypress and other testing frameworks
5. **Data Integrity**: Ensures consistent run identification across all environments

### **Why No `window.__eventStatsId`?**

The plugin intentionally avoids global window variables because:

1. **Environment Limitations**: Window variables don't work in server environments
2. **Implicit Behavior**: Global variables create "magic" that's hard to debug
3. **Testing Complexity**: Global state makes testing more difficult
4. **Stratum Philosophy**: Stratum prefers explicit configuration over implicit state
5. **Cross-Environment**: Window variables limit cross-environment compatibility

### **Why No `startServer()` Method?**

The plugin intentionally does not include a `startServer()` method because:

1. **Process Management**: Users should control when the dashboard starts/stops
2. **Port Conflicts**: Explicit CLI prevents accidental port conflicts
3. **Environment Flexibility**: Different environments need different server configurations
4. **Separation of Concerns**: Plugin handles events, CLI handles server management

### **Why Static Logging Control?**

The publisher uses static logging control because:

1. **Global Consistency**: All publisher instances share the same logging state
2. **Simplified Configuration**: One setting controls all logging
3. **Testing Benefits**: Can reset logging state between tests
4. **Logical Ownership**: Publisher owns its logging, not the plugin

### **Why Explicit Dashboard URL?**

The plugin requires an explicit `dashboardUrl` because:

1. **No Magic**: No assumptions about where the dashboard is running
2. **Environment Support**: Works in browser, server, and test environments
3. **Flexibility**: Can point to any dashboard server
4. **Debugging**: Clear visibility into where events are being sent

### **Why File-Based Storage?**

The dashboard server uses file-based storage because:

1. **Simplicity**: No database setup required
2. **Persistence**: Data survives server restarts
3. **Debugging**: Files can be inspected manually
4. **Development Focus**: Appropriate for development/testing workflows

### **Why Per-Run Catalog Storage?**

Each run stores its own catalog because:

1. **Accurate Comparisons**: Compare event usage against the correct catalog for each run
2. **Catalog Evolution**: Track how event definitions change over time
3. **A/B Testing**: Compare different event schemas in separate runs
4. **Debugging**: Identify when events don't match the expected catalog
5. **Data Integrity**: Ensure catalog and stats are always in sync for each run

## 🎨 **Design Patterns**

### **Stratum Plugin Pattern**

The plugin follows Stratum's plugin architecture:

```javascript
// Extends BasePlugin and provides publishers
export class EventCounterPlugin extends BasePlugin<any, EventCounterPluginOptions> {
  getPublishers() {
    return [this.publisher];
  }
}
```

Benefits:

- **Framework Integration**: Natural fit with Stratum's architecture
- **Consistent API**: Follows established Stratum patterns
- **Extensibility**: Easy to extend and customize
- **Event Flow**: Integrates seamlessly with Stratum's event system

### **Factory Pattern**

The plugin uses a factory pattern for configuration:

```javascript
// Factory provides clean configuration interface
const plugin = EventCounterPluginFactory({
  dashboardUrl: 'http://localhost:3000',
  enableLogging: true
});
```

Benefits:

- **Clean API**: Simple, focused configuration
- **Validation**: Factory can validate configuration
- **Defaults**: Sensible defaults with override capability
- **Consistency**: All plugins created the same way

### **Static Configuration**

The publisher uses static configuration for global state:

```javascript
// Global configuration affects all instances
EventCounterPublisher.setLogging(true);
const publisher1 = new EventCounterPublisher();
const publisher2 = new EventCounterPublisher();
// Both publishers have logging enabled
```

Benefits:

- **Consistency**: All instances behave the same way
- **Simplicity**: Single point of configuration
- **Performance**: No per-instance overhead
- **Testing**: Easy to reset state between tests

### **HTTP API Communication**

The plugin communicates with the dashboard via HTTP API:

```javascript
// Simple HTTP POST for event updates
await fetch(`${dashboardUrl}/api/events-stats?statsId=${runId}`, {
  method: 'POST',
  body: JSON.stringify({ eventKey, timestamp })
});
```

Benefits:

- **Standard Protocol**: HTTP is well-understood and debuggable
- **Environment Agnostic**: Works in browser and server environments
- **Flexible**: Can point to any HTTP server
- **Debuggable**: Can use standard HTTP debugging tools

### **Per-Run Data Isolation**

Each run maintains its own data files:

```javascript
// Run-specific file naming
const statsFile = `event-stats-${runId}.json`;
const catalogFile = `event-catalog-${runId}.json`;
```

Benefits:

- **Data Integrity**: Catalog and stats are always paired correctly
- **Comparison Accuracy**: Compare usage against the right catalog
- **Isolation**: Runs don't interfere with each other
- **Cleanup**: Can remove entire runs including their catalogs

## 🚫 **What We Don't Do**

### **No Global Window Variables**

We don't use global window variables because:

- **Environment Limitations**: Don't work in server environments
- **Implicit Behavior**: Create "magic" that's hard to debug
- **Testing Complexity**: Global state makes testing difficult
- **Cross-Environment**: Limit compatibility across environments
- **Stratum Philosophy**: Contradicts explicit configuration principles

### **No Automatic Server Management**

We don't automatically start servers because:

- **Process Control**: Users should control their own processes
- **Port Conflicts**: Automatic port selection can cause conflicts
- **Environment Differences**: Different environments need different approaches
- **Debugging Complexity**: Automatic processes are harder to debug

### **No Implicit Configuration**

We don't use implicit configuration because:

- **Magic Behavior**: Implicit config creates "magic" that's hard to debug
- **Environment Issues**: What works in one environment might not work in another
- **Debugging Difficulty**: Implicit behavior is harder to trace
- **Predictability**: Explicit config is more predictable

### **No Production Features**

We don't include production features because:

- **Focus**: Plugin is designed for development/testing
- **Complexity**: Production features would add unnecessary complexity
- **Security**: Development tools shouldn't have production security concerns
- **Performance**: Development tools can prioritize convenience over performance

### **No Global Catalog**

We don't use a single global catalog because:

- **Comparison Accuracy**: Global catalog can't match all runs
- **Catalog Evolution**: Can't track how catalogs change over time
- **A/B Testing**: Can't compare different event schemas
- **Data Integrity**: Catalog and stats can become mismatched

## 🎯 **Guiding Questions**

When making design decisions, we ask:

1. **Does this improve developer experience?** - Primary focus
2. **Is this explicit rather than implicit?** - Configuration philosophy
3. **Does this separate concerns properly?** - Architecture principle
4. **Is this appropriate for development/testing?** - Scope limitation
5. **Does this follow established patterns?** - Consistency principle
6. **Does this enable accurate comparisons?** - Data integrity principle
7. **Does this work across environments?** - Cross-environment compatibility
8. **Does this align with Stratum patterns?** - Framework integration

## 🔮 **Future Considerations**

The plugin is designed to evolve while maintaining these principles:

- **Extensibility**: New features should follow existing patterns
- **Backward Compatibility**: Changes should not break existing usage
- **Simplicity**: New features should not add unnecessary complexity
- **Focus**: New features should support development/testing workflows
- **Data Integrity**: New features should maintain per-run data isolation
- **Cross-Environment**: New features should work in browser and server environments
- **Stratum Alignment**: New features should align with Stratum's architecture

This philosophy ensures the plugin remains focused, predictable, and valuable for its intended use case while maintaining strong integration with the Stratum observability framework.
