import { EventCounterPublisher } from "../src/event-counter-publisher";
import { describe, it, expect, beforeEach, vi } from "vitest";

describe("EventCounterPublisher", () => {
    let publisher: EventCounterPublisher;
    const testCatalog = {
        "user-login": { description: "User logs in" },
        "user-logout": { description: "User logs out" }
    };

    beforeEach(() => {
        publisher = new EventCounterPublisher("http://localhost:41321", testCatalog);
        EventCounterPublisher.setLogging(false);
    });

    describe("Constructor", () => {
        it("should create publisher with default dashboard URL", () => {
            const defaultPublisher = new EventCounterPublisher();
            expect(defaultPublisher).toBeDefined();
        });

        it("should create publisher with custom dashboard URL", () => {
            const customPublisher = new EventCounterPublisher("http://localhost:3000", testCatalog);
            expect(customPublisher).toBeDefined();
        });

        it("should create publisher with catalog", () => {
            const catalogPublisher = new EventCounterPublisher("http://localhost:41321", testCatalog);
            expect(catalogPublisher).toBeDefined();
        });
    });

    describe("Logging", () => {
        it("should enable logging when set", () => {
            EventCounterPublisher.setLogging(true);
            const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => { });

            const publisher = new EventCounterPublisher();

            expect(consoleSpy).toHaveBeenCalledWith("[EventCounterPublisher] Constructor called");

            consoleSpy.mockRestore();
        });

        it("should disable logging when set", () => {
            EventCounterPublisher.setLogging(false);
            const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => { });

            const publisher = new EventCounterPublisher();

            expect(consoleSpy).not.toHaveBeenCalledWith("[EventCounterPublisher] Constructor called");

            consoleSpy.mockRestore();
        });
    });

    describe("Event Publishing", () => {
        it("should handle events with event key", async () => {
            const mockFetch = vi.fn().mockResolvedValue({
                ok: true,
                json: () => Promise.resolve({ success: true })
            });
            global.fetch = mockFetch;

            await publisher.publish({ event: { key: "user-login" } });

            expect(mockFetch).toHaveBeenCalledWith(
                "http://localhost:41321/api/events-stats?statsId=default",
                expect.objectContaining({
                    method: "POST",
                    body: expect.stringContaining("user-login")
                })
            );
        });

        it("should handle events with snapshot", async () => {
            const mockFetch = vi.fn().mockResolvedValue({
                ok: true,
                json: () => Promise.resolve({ success: true })
            });
            global.fetch = mockFetch;

            await publisher.publish({ snapshot: { event: { key: "user-logout" } } });

            expect(mockFetch).toHaveBeenCalledWith(
                "http://localhost:41321/api/events-stats?statsId=default",
                expect.objectContaining({
                    method: "POST",
                    body: expect.stringContaining("user-logout")
                })
            );
        });

        it("should handle events without key gracefully", async () => {
            EventCounterPublisher.setLogging(true);
            const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => { });

            await publisher.publish({ event: {} });

            expect(consoleSpy).toHaveBeenCalledWith(
                "[EventCounterPublisher] No event key found in content:",
                { event: {} }
            );

            consoleSpy.mockRestore();
        });

        it("should handle API errors gracefully", async () => {
            const mockFetch = vi.fn().mockResolvedValue({
                ok: false,
                status: 500,
                statusText: "Internal Server Error"
            });
            global.fetch = mockFetch;

            await publisher.publish({ event: { key: "test-event" } });

            // Should not throw, just log error
            expect(mockFetch).toHaveBeenCalled();
        });
    });

    describe("Catalog Management", () => {
        it("should send catalog to server on initialization", async () => {
            const mockFetch = vi.fn().mockResolvedValue({
                ok: true,
                json: () => Promise.resolve({ success: true })
            });
            global.fetch = mockFetch;

            publisher.onInitialize({ registeredEventIds: testCatalog });

            // Wait for async catalog sending
            await new Promise(resolve => setTimeout(resolve, 0));

            expect(mockFetch).toHaveBeenCalledWith(
                "http://localhost:41321/api/catalog?statsId=default",
                expect.objectContaining({
                    method: "POST",
                    body: JSON.stringify(testCatalog)
                })
            );
        });

        it("should handle catalog API errors gracefully", async () => {
            const mockFetch = vi.fn().mockResolvedValue({
                ok: false,
                status: 500,
                statusText: "Internal Server Error"
            });
            global.fetch = mockFetch;

            EventCounterPublisher.setLogging(true);
            const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => { });

            publisher.onInitialize({ registeredEventIds: testCatalog });

            // Wait for async catalog sending
            await new Promise(resolve => setTimeout(resolve, 0));

            expect(consoleSpy).toHaveBeenCalledWith(
                "[EventCounterPublisher] Catalog API error: 500 Internal Server Error"
            );

            consoleSpy.mockRestore();
        });
    });

    describe("Stats and State", () => {
        it("should return current stats", () => {
            const stats = publisher.getStats();
            expect(stats).toHaveProperty("events");
            expect(stats).toHaveProperty("totalEvents");
            expect(stats).toHaveProperty("startTime");
        });

        it("should return event counts", () => {
            const counts = publisher.getEventCounts();
            expect(counts).toEqual({});
        });

        it("should reset state", () => {
            publisher.reset();
            const stats = publisher.getStats();
            expect(stats.totalEvents).toBe(0);
            expect(Object.keys(stats.events)).toHaveLength(0);
        });

        it("should provide summary", () => {
            const summary = publisher.getSummary();
            expect(summary).toContain("Event Counter:");
            expect(summary).toContain("0 total events");
        });
    });

    describe("Event Analysis", () => {
        beforeEach(async () => {
            // Mock fetch for the event publishing
            const mockFetch = vi.fn().mockResolvedValue({
                ok: true,
                json: () => Promise.resolve({ success: true })
            });
            global.fetch = mockFetch;

            // Publish some events to set up state
            await publisher.publish({ event: { key: "user-login" } });
            await publisher.publish({ event: { key: "user-login" } });
            await publisher.publish({ event: { key: "user-logout" } });
        });

        it("should identify unused events", () => {
            const unused = publisher.getUnusedEvents();
            // The events were published, so they should not be unused
            expect(unused).not.toContain("user-login");
            expect(unused).not.toContain("user-logout");
        });

        it("should get most used events", () => {
            const mostUsed = publisher.getMostUsedEvents(5);
            expect(mostUsed).toHaveLength(2);
            expect(mostUsed[0].key).toBe("user-login");
            expect(mostUsed[0].count).toBe(2);
            expect(mostUsed[1].key).toBe("user-logout");
            expect(mostUsed[1].count).toBe(1);
        });
    });
}); 