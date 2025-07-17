import { BasePlugin } from "@capitalone/stratum-observability";

import { EventCounterPublisher } from "./event-counter-publisher";

export interface EventCounterPluginOptions {
  enableConsoleLogging?: boolean;
  statsApiBaseUrl?: string;
  catalog?: Record<string, any>; // Accept a catalog
}

export class EventCounterPlugin extends BasePlugin<
  any,
  EventCounterPluginOptions
> {
  name = "event-counter";
  options: EventCounterPluginOptions;
  context: any;
  publishers: EventCounterPublisher[];

  constructor(options: EventCounterPluginOptions = {}) {
    super();
    this.options = {
      enableConsoleLogging: false, // Default to false to reduce noise
      statsApiBaseUrl: "http://localhost:41321",
      ...options,
    };

    if (this.options.enableConsoleLogging) {
      console.log("[EventCounterPlugin] Constructor called");
    }

    this.context = {};
    this.publishers = [new EventCounterPublisher(this.options.statsApiBaseUrl, this.options.enableConsoleLogging)];

    // Persist the catalog if provided, only on the server
    if (this.options.catalog && typeof window === "undefined") {
      try {
        // Dynamically import fs and path only on the server
        // @ts-ignore
        const fs = require("fs");
        // @ts-ignore
        const path = require("path");
        const catalogPath = path.join(process.cwd(), "event-catalog.json");

        fs.writeFileSync(
          catalogPath,
          JSON.stringify(this.options.catalog, null, 2),
          "utf-8",
        );

        if (this.options.enableConsoleLogging) {
          console.log(`[EventCounterPlugin] Catalog written to ${catalogPath}`);
        }
      } catch (e) {
        if (this.options.enableConsoleLogging) {
          console.warn("[EventCounterPlugin] Failed to write catalog:", e);
        }
      }
    }

    if (this.options.enableConsoleLogging) {
      console.log("[EventCounterPlugin] Constructor completed");
    }
  }

  onRegister(): void {
    if (this.options.enableConsoleLogging) {
      console.log("[EventCounterPlugin] onRegister called");
      console.log(
        "EventCounterPlugin registered. Tracking all events with counts.",
      );
    }
  }

  // Get access to the publisher for external use
  getPublisher(): EventCounterPublisher | undefined {
    return this.publishers[0];
  }
}

/**
 * Factory for EventCounterPlugin. Pass your event catalog as { catalog: EventCatalog } to make it available to the dashboard.
 */
export function EventCounterPluginFactory(options?: EventCounterPluginOptions) {
  if (options?.enableConsoleLogging) {
    console.log("[EventCounterPluginFactory] Creating new EventCounterPlugin");
  }

  return new EventCounterPlugin(options);
}
