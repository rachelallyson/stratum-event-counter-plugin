import { BasePublisher } from "@capitalone/stratum-observability";

export interface EventCount {
  count: number;
  lastUsed?: string;
  firstUsed?: string;
}

export interface EventCounterState {
  events: Record<string, EventCount>;
  totalEvents: number;
  startTime: string;
}

export class EventCounterPublisher extends BasePublisher {
  name = "eventCounter";
  private state: EventCounterState;
  private dashboardUrl: string;
  private catalog: Record<string, any>;
  private static enableLogging = false;

  constructor(dashboardUrl = 'http://localhost:41321', catalog: Record<string, any> = {}) {
    super();
    this.dashboardUrl = dashboardUrl;
    this.catalog = catalog;
    this.state = {
      events: {},
      startTime: new Date().toISOString(),
      totalEvents: 0,
    };

    if (EventCounterPublisher.enableLogging) {
      console.log("[EventCounterPublisher] Constructor called");
    }
  }

  static setLogging(enabled: boolean) {
    EventCounterPublisher.enableLogging = enabled;
  }

  shouldPublishEvent(event: any): boolean {
    if (EventCounterPublisher.enableLogging) {
      console.log("[EventCounterPublisher] shouldPublishEvent called with:", event);
    }
    return true; // Handle all events
  }

  async isAvailable(event: any, snapshot: any): Promise<boolean> {
    if (EventCounterPublisher.enableLogging) {
      console.log("[EventCounterPublisher] isAvailable called with:", { event, snapshot });
    }
    return true; // Always available
  }

  onInitialize(injector: any): void {
    if (EventCounterPublisher.enableLogging) {
      console.log(
        "[EventCounterPublisher] onInitialize called with injector:",
        injector,
      );
    }

    // Initialize events from the catalog
    if (injector?.registeredEventIds) {
      if (EventCounterPublisher.enableLogging) {
        console.log(
          "[EventCounterPublisher] Initializing events from catalog, count:",
          Object.keys(injector.registeredEventIds).length,
        );
      }

      Object.keys(injector.registeredEventIds).forEach((key) => {
        this.state.events[key] = { count: 0 };
      });

      if (EventCounterPublisher.enableLogging) {
        console.log(
          "[EventCounterPublisher] Initialized events:",
          Object.keys(this.state.events),
        );
      }
    }

    // Send catalog to server for this run
    this.sendCatalogToServer();
  }

  private async sendCatalogToServer(): Promise<void> {
    try {
      // Server automatically uses active run ID, no need to fetch it
      const apiUrl = `${this.dashboardUrl}/api/catalog`;

      if (EventCounterPublisher.enableLogging) {
        console.log("[EventCounterPublisher] Sending catalog to API:", {
          apiUrl,
          catalog: this.catalog,
        });
      }

      const response = await fetch(apiUrl, {
        body: JSON.stringify(this.catalog),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });

      if (EventCounterPublisher.enableLogging) {
        console.log(
          "[EventCounterPublisher] Catalog API response status:",
          response.status,
        );
      }

      if (!response.ok) {
        if (EventCounterPublisher.enableLogging) {
          console.error(
            `[EventCounterPublisher] Catalog API error: ${response.status} ${response.statusText}`,
          );
        }
        return;
      }

      const result = await response.json();

      if (EventCounterPublisher.enableLogging) {
        console.log("[EventCounterPublisher] Catalog API response:", result);
      }
    } catch (error) {
      // Silently fail if API is not available, but warn if logging is enabled
      if (EventCounterPublisher.enableLogging) {
        console.warn(
          "[EventCounterPublisher] Failed to send catalog to API:",
          error,
        );
      }
    }
  }

  getEventOutput(event: any, snapshot: any): any {
    return { event, snapshot };
  }

  async publish(content: any): Promise<void> {
    const eventKey = content.event?.key || content.snapshot?.event?.key;

    if (!eventKey) {
      if (EventCounterPublisher.enableLogging) {
        console.warn(
          "[EventCounterPublisher] No event key found in content:",
          content,
        );
      }
      return;
    }

    if (EventCounterPublisher.enableLogging) {
      console.log(
        `[EventCounterPublisher] onPublish called for event: ${eventKey}`,
      );
      console.log(
        "[EventCounterPublisher] Full content:",
        JSON.stringify(content, null, 2),
      );
    }

    // Increment in-memory counts
    this.state.totalEvents++;
    if (!this.state.events[eventKey]) {
      this.state.events[eventKey] = { count: 0 };
    }
    const eventCount = this.state.events[eventKey];

    eventCount.count++;
    const now = new Date().toISOString();

    eventCount.firstUsed ??= now;
    eventCount.lastUsed = now;

    if (EventCounterPublisher.enableLogging) {
      console.log(
        `[EventCounterPublisher] Event Counter: ${eventKey} (count: ${eventCount.count})`,
      );
    }

    // Send event update to API for persistent storage
    try {
      // Server automatically uses active run ID, no need to fetch it
      const apiUrl = `${this.dashboardUrl}/api/events-stats`;

      if (EventCounterPublisher.enableLogging) {
        console.log("[EventCounterPublisher] Sending event to API:", {
          apiUrl,
          eventKey,
          timestamp: now,
        });
      }

      const response = await fetch(apiUrl, {
        body: JSON.stringify({
          eventKey,
          timestamp: now,
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });

      if (EventCounterPublisher.enableLogging) {
        console.log(
          "[EventCounterPublisher] API response status:",
          response.status,
        );
      }

      if (!response.ok) {
        if (EventCounterPublisher.enableLogging) {
          console.error(
            `[EventCounterPublisher] API error: ${response.status} ${response.statusText}`,
          );
        }
        return;
      }

      const result = await response.json();

      if (EventCounterPublisher.enableLogging) {
        console.log("[EventCounterPublisher] API response:", result);
      }
    } catch (error) {
      // Silently fail if API is not available, but warn if logging is enabled
      if (EventCounterPublisher.enableLogging) {
        console.warn(
          "[EventCounterPublisher] Failed to persist event to API:",
          error,
        );
      }
    }
  }

  getStats(): EventCounterState {
    return { ...this.state };
  }

  getEventCounts(): Record<string, EventCount> {
    return { ...this.state.events };
  }

  getUnusedEvents(): string[] {
    return Object.entries(this.state.events)
      .filter(([_, count]) => count.count === 0)
      .map(([key]) => key);
  }

  getMostUsedEvents(limit = 10): { key: string; count: number }[] {
    return Object.entries(this.state.events)
      .filter(([_, count]) => count.count > 0)
      .sort(([_, a], [__, b]) => b.count - a.count)
      .slice(0, limit)
      .map(([key, count]) => ({ count: count.count, key }));
  }

  reset(): void {
    this.state = {
      events: {},
      startTime: new Date().toISOString(),
      totalEvents: 0,
    };
  }

  getSummary(): string {
    const totalEvents = this.state.totalEvents;
    const eventCount = Object.keys(this.state.events).length;
    const usedEvents = Object.values(this.state.events).filter(
      (count) => count.count > 0,
    ).length;

    return `Event Counter: ${totalEvents} total events, ${usedEvents}/${eventCount} events used`;
  }
}
