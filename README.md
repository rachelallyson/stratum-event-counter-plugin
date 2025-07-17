# @rachelallyson/stratum-event-counter-plugin

A Stratum plugin for event counting and file logging. Tracks how many times each event in your Stratum catalog is called, and provides a simple Express server for viewing and resetting stats.

## Installation

```sh
npm install @rachelallyson/stratum-event-counter-plugin
```

## Usage

### 1. Register the plugin with Stratum

```ts
import { StratumService } from "@capitalone/stratum-observability";
import { EventCounterPluginFactory } from "@rachelallyson/stratum-event-counter-plugin";

const stratumService = new StratumService({
  catalog: { items: EventCatalog },
  plugins: [EventCounterPluginFactory({
    enableConsoleLogging: false // Set to true to enable detailed console logs
  })],
  productName: "your-product",
  productVersion: "1.0.0",
});
```

### 2. Configuration Options

The plugin accepts the following options:

- `enableConsoleLogging` (boolean): Enable detailed console logging. Default: `false`
- `statsApiBaseUrl` (string): Base URL for the stats API server. Default: `"http://localhost:41321"`
- `catalog` (object): Pass your event catalog to make it available to the dashboard

```ts
EventCounterPluginFactory({
  enableConsoleLogging: true, // Enable verbose logging for debugging
  statsApiBaseUrl: "http://localhost:3000", // Custom API server URL
  catalog: EventCatalog // Your event catalog
})
```

### 3. Start the event counter server

```sh
npx stratum-event-counter-plugin serve
```

- The dashboard will be available at [http://localhost:41321](http://localhost:41321) by default.
- Use `--port <port>` to change the port.

### 4. API Endpoints

- `GET /api/events-stats?statsId=run-<id>`: Get event stats for a run.
- `POST /api/events-stats?statsId=run-<id>`: Update event stats.
- `PUT /api/events-stats?statsId=run-<id>`: Reset event stats.

### 5. Cypress/Automated Testing

- Set `window.__eventStatsId = "run-<id>"` before publishing events to group stats by test run.
- After tests, check the generated `event-stats-run-<id>.json` files for event counts.

## Contributing

Pull requests and issues are welcome! Please open an issue to discuss changes or improvements.

## License

MIT
