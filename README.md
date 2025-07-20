# @rachelallyson/stratum-event-counter-plugin

A development and testing plugin for Stratum that tracks event counts and provides a real-time dashboard.

## Quick Start

### 1. Install the Plugin

```bash
npm install @rachelallyson/stratum-event-counter-plugin
```

### 2. Start the Dashboard Server

```bash
# Start on default port (41321)
npx @rachelallyson/stratum-event-counter-plugin

# Or start on a custom port
EVENT_COUNTER_PORT=3000 npx @rachelallyson/stratum-event-counter-plugin
```

### 3. Add the Plugin to Your App

```javascript
import { StratumService } from "@capitalone/stratum-observability";
import { EventCounterPluginFactory } from "@rachelallyson/stratum-event-counter-plugin";

// Create your event catalog
const eventCatalog = {
  "user-login": { description: "User logs in" },
  "user-logout": { description: "User logs out" },
  "page-view": { description: "User views a page" }
};

// Create the plugin
const plugin = EventCounterPluginFactory({
  catalog: eventCatalog,
  dashboardUrl: 'http://localhost:41321' // Match your dashboard port
});

// Register with Stratum
const stratumService = new StratumService({
  plugins: [plugin],
  catalog: eventCatalog,
  productName: 'myApp',
  productVersion: '1.0.0'
});

// Publish events
stratumService.publish('user-login');
```

### 4. View the Dashboard

Open your browser to `http://localhost:41321` (or your custom port) to see:

- Event counts and usage statistics
- First and last usage timestamps
- Search and filtering capabilities
- Export to CSV/JSON
- Automatic cleanup of old run files
- Manual cleanup controls

## Configuration Options

### Plugin Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `dashboardUrl` | string | `'http://localhost:41321'` | URL where dashboard server is running |
| `catalog` | object | `{}` | Your event catalog (required for dashboard) |
| `enableLogging` | boolean | `false` | Enable debug logging for publisher |

### Dashboard Server Environment Variables

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `EVENT_COUNTER_PORT` | number | `41321` | Dashboard server port |
| `EVENT_COUNTER_MAX_RUNS` | number | `25` | Maximum number of runs to keep (oldest are automatically removed) |

## Common Usage Patterns

### Development with Custom Port

```javascript
// Plugin posts to port 3000
const plugin = EventCounterPluginFactory({
  dashboardUrl: 'http://localhost:3000',
  catalog: eventCatalog
});

// Start dashboard on port 3000
// Terminal: EVENT_COUNTER_PORT=3000 npx @rachelallyson/stratum-event-counter-plugin
```

### Browser Testing (Cypress/Playwright)

```javascript
// Plugin posts to test server
const plugin = EventCounterPluginFactory({
  dashboardUrl: 'http://localhost:3001',
  catalog: eventCatalog
});

// Test server runs dashboard on port 3001
// Your test framework controls the test server
```

### Default Configuration

```javascript
// Uses default dashboard URL (http://localhost:41321)
const plugin = EventCounterPluginFactory({
  catalog: eventCatalog
});

// Start dashboard with default port
// Terminal: npx @rachelallyson/stratum-event-counter-plugin
```

## Event Catalog Format

Your event catalog should be an object where each key is an event name:

```javascript
{
  "user-login": {
    "description": "User logs in to the application"
  },
  "user-logout": {
    "description": "User logs out of the application"
  },
  "page-view": {
    "description": "User views a page"
  }
}
```

## Data Management

The plugin automatically manages data files to prevent the data folder from getting cluttered:

### Automatic Cleanup

- **Startup cleanup**: Old run files are automatically removed when the server starts
- **Runtime cleanup**: When posting new events, if the number of runs exceeds `EVENT_COUNTER_MAX_RUNS`, the oldest runs are removed
- **Catalog cleanup**: When a run is removed, its corresponding catalog file is also removed

### Manual Cleanup

- **Dashboard button**: Use the "Cleanup Old Runs" button in the dashboard
- **API endpoint**: Call `POST /api/cleanup` to manually trigger cleanup
- **Status check**: Call `GET /api/cleanup` to check if cleanup is needed

### File Organization

- **Per-run storage**: Each run gets its own stats and catalog files
- **Default run**: The default run uses `event-stats.json` and `event-catalog.json`
- **Named runs**: Other runs use `event-stats-{runId}.json` and `event-catalog-{runId}.json`

## API Endpoints

The dashboard server provides these endpoints:

- `GET /` - Dashboard HTML
- `GET /api/events-stats` - Get event statistics
- `POST /api/events-stats` - Update event statistics
- `GET /api/catalog` - Get event catalog for a run
- `POST /api/catalog` - Update event catalog for a run
- `GET /api/runs` - List available runs
- `GET /api/cleanup` - Get cleanup status
- `POST /api/cleanup` - Manually trigger cleanup of old runs

## Development

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Start dashboard server
npm run server

# Run in development mode
npm run dev

# Run tests
npm test
```

## Testing

```bash
# Unit tests
npm run test:unit

# E2E tests
npm run test:e2e

# Watch mode
npm run test:watch
```

## Production Considerations

**Note:** This plugin is designed for **development and testing**. For production:

1. Use standard plugin integration without dashboard features
2. Consider separate monitoring solutions for production observability
3. The dashboard server is not intended for production deployment

## Troubleshooting

### Dashboard Not Loading

1. **Check the port**: Make sure your plugin's `dashboardUrl` matches the dashboard server port
2. **Start the server**: Ensure the dashboard server is running via CLI
3. **Check for conflicts**: Make sure the port isn't used by another application

### Events Not Appearing

1. **Check logging**: Enable `enableLogging: true` to see debug output
2. **Verify URL**: Ensure `dashboardUrl` points to the correct server
3. **Check network**: Verify the plugin can reach the dashboard server

### Port Conflicts

1. **Use different ports**: Set `EVENT_COUNTER_PORT` to an available port
2. **Update plugin config**: Change `dashboardUrl` to match the new port
3. **Check running processes**: Make sure no other service is using the port

## Philosophy

For detailed information about the plugin's design principles and architectural decisions, see [PHILOSOPHY.md](./PHILOSOPHY.md).
