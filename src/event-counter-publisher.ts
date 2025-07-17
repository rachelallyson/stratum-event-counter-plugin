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
  private statsApiBaseUrl: string;
  private enableConsoleLogging: boolean;

  constructor(statsApiBaseUrl?: string, enableConsoleLogging = false) {
    super();
    this.statsApiBaseUrl = statsApiBaseUrl || "";
    this.enableConsoleLogging = enableConsoleLogging;
    this.state = {
      events: {},
      startTime: new Date().toISOString(),
      totalEvents: 0,
    };

    if (this.enableConsoleLogging) {
      console.log("[EventCounterPublisher] Constructor called");
    }
  }

  shouldPublishEvent(): boolean {
    return true; // Handle all events
  }

  async isAvailable(): Promise<boolean> {
    return true; // Always available
  }

  onInitialize(injector: any): void {
    if (this.enableConsoleLogging) {
      console.log(
        "[EventCounterPublisher] onInitialize called with injector:",
        injector,
      );
    }

    // Initialize events from the catalog
    if (injector?.registeredEventIds) {
      if (this.enableConsoleLogging) {
        console.log(
          "[EventCounterPublisher] Initializing events from catalog, count:",
          Object.keys(injector.registeredEventIds).length,
        );
      }

      Object.keys(injector.registeredEventIds).forEach((key) => {
        this.state.events[key] = { count: 0 };
      });

      if (this.enableConsoleLogging) {
        console.log(
          "[EventCounterPublisher] Initialized events:",
          Object.keys(this.state.events),
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
      if (this.enableConsoleLogging) {
        console.warn(
          "[EventCounterPublisher] No event key found in content:",
          content,
        );
      }
      return;
    }

    if (this.enableConsoleLogging) {
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

    if (this.enableConsoleLogging) {
      console.log(
        `[EventCounterPublisher] Event Counter: ${eventKey} (count: ${eventCount.count})`,
      );
    }

    // Send event update to API for persistent storage
    try {
      // Get the test name from the window (if running in browser)
      let statsId = "default";

      if (typeof window !== "undefined" && (window as any).__eventStatsId) {
        statsId = (window as any).__eventStatsId;
      }
      let apiUrl = `/api/events-stats?statsId=${encodeURIComponent(statsId)}`;

      if (this.statsApiBaseUrl) {
        apiUrl = `${this.statsApiBaseUrl.replace(/\/$/, "")}/api/events-stats?statsId=${encodeURIComponent(statsId)}`;
      }

      if (this.enableConsoleLogging) {
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

      if (this.enableConsoleLogging) {
        console.log(
          "[EventCounterPublisher] API response status:",
          response.status,
        );
      }

      if (!response.ok) {
        if (this.enableConsoleLogging) {
          console.error(
            `[EventCounterPublisher] API error: ${response.status} ${response.statusText}`,
          );
        }
        return;
      }

      const result = await response.json();

      if (this.enableConsoleLogging) {
        console.log("[EventCounterPublisher] API response:", result);
      }
    } catch (error) {
      // Silently fail if API is not available, but warn if logging is enabled
      if (this.enableConsoleLogging) {
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
    const usedEvents = Object.values(this.state.events).filter(
      (e) => e.count > 0,
    ).length;
    const totalCatalogEvents = Object.keys(this.state.events).length;
    const unusedEvents = totalCatalogEvents - usedEvents;
    const mostUsed = this.getMostUsedEvents(5);
    const unused = this.getUnusedEvents().slice(0, 5);
    let summary = "Event Counter Summary\n";

    summary += `Total Events Published: ${this.state.totalEvents}\n`;
    summary += `Unique Events Used: ${usedEvents}/${totalCatalogEvents}\n`;
    summary += `Unused Events: ${unusedEvents}\n`;
    summary += `Tracking Since: ${this.state.startTime}\n\n`;
    if (mostUsed.length > 0) {
      summary += "Most Used Events:\n";
      mostUsed.forEach(({ count, key }) => {
        summary += `  ${key}: ${count} times\n`;
      });
      summary += "\n";
    }
    if (unused.length > 0) {
      summary += "Sample Unused Events:\n";
      unused.forEach((key) => {
        summary += `  ${key}\n`;
      });
    }

    return summary;
  }
}
