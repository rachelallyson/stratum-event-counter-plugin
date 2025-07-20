import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { EventCounterPluginFactory } from '../src/event-counter-plugin'

describe('EventCounterPlugin Configuration', () => {
    it('should have correct default options', () => {
        const plugin = EventCounterPluginFactory();

        expect(plugin.options.enableLogging).toBe(false);
        expect(plugin.options.dashboardUrl).toBe('http://localhost:41321');
        expect(plugin.options.catalog).toEqual({});
    });

    it('should accept custom options', () => {
        const plugin = EventCounterPluginFactory({
            enableLogging: true,
            dashboardUrl: 'http://localhost:8080',
            catalog: {
                'custom-event': { description: 'Custom event' }
            }
        });

        expect(plugin.options.enableLogging).toBe(true);
        expect(plugin.options.dashboardUrl).toBe('http://localhost:8080');
        expect(plugin.options.catalog).toEqual({
            'custom-event': { description: 'Custom event' }
        });
    });

    it('should merge partial options with defaults', () => {
        const plugin = EventCounterPluginFactory({
            enableLogging: true
        });

        expect(plugin.options.enableLogging).toBe(true);
        expect(plugin.options.dashboardUrl).toBe('http://localhost:41321'); // Default
    });

    it('should handle empty options object', () => {
        const plugin = EventCounterPluginFactory({});

        expect(plugin.options.enableLogging).toBe(false);
        expect(plugin.options.dashboardUrl).toBe('http://localhost:41321');
    });

    it('should handle undefined options', () => {
        const plugin = EventCounterPluginFactory();

        expect(plugin.options.enableLogging).toBe(false);
        expect(plugin.options.dashboardUrl).toBe('http://localhost:41321');
    });

    it('should validate dashboard URL is a string', () => {
        const plugin = EventCounterPluginFactory({
            dashboardUrl: 'http://localhost:3000'
        });

        expect(typeof plugin.options.dashboardUrl).toBe('string');
        expect(plugin.options.dashboardUrl).toBe('http://localhost:3000');
    });

    it('should validate enable logging is boolean', () => {
        const plugin = EventCounterPluginFactory({
            enableLogging: true
        });

        expect(typeof plugin.options.enableLogging).toBe('boolean');
        expect(plugin.options.enableLogging).toBe(true);
    });

    it('should handle catalog with various event types', () => {
        const testCatalog = {
            'simple-event': { description: 'Simple event' },
            'complex-event': { description: 'Complex event with data' },
            'nested-event': { description: 'Event with nested structure' }
        };

        const plugin = EventCounterPluginFactory({
            catalog: testCatalog
        });

        expect(plugin.options.catalog).toEqual(testCatalog);
    });

    it('should handle large catalogs', () => {
        const largeCatalog: Record<string, any> = {};
        for (let i = 0; i < 100; i++) {
            largeCatalog[`event-${i}`] = { description: `Event ${i}` };
        }

        const plugin = EventCounterPluginFactory({
            catalog: largeCatalog
        });

        expect(Object.keys(plugin.options.catalog || {})).toHaveLength(100);
    });

    it('should handle edge case values', () => {
        const plugin = EventCounterPluginFactory({
            dashboardUrl: 'http://localhost:0', // Edge case: port 0
            enableLogging: false // Edge case: explicit false
        });

        expect(plugin.options.dashboardUrl).toBe('http://localhost:0');
        expect(plugin.options.enableLogging).toBe(false);
    });

    it('should handle very large numbers', () => {
        const plugin = EventCounterPluginFactory({
            dashboardUrl: 'http://localhost:65535' // Max port number
        });

        expect(plugin.options.dashboardUrl).toBe('http://localhost:65535');
    });
}); 