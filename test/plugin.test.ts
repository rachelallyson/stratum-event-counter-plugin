import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { EventCounterPluginFactory, EventCounterPlugin } from '../src/event-counter-plugin'

describe('EventCounterPlugin', () => {
    const testCatalog = {
        'user-login': { description: 'User logs in' },
        'user-logout': { description: 'User logs out' },
        'page-view': { description: 'User views a page' }
    }

    beforeEach(() => {
        // No mocks needed for these tests
    })

    afterEach(() => {
        vi.clearAllMocks()
    })

    describe('EventCounterPluginFactory', () => {
        it('should create plugin with default options', () => {
            const plugin = EventCounterPluginFactory()

            expect(plugin).toBeInstanceOf(EventCounterPlugin)
            expect(plugin.options.enableLogging).toBe(false)
            expect(plugin.options.dashboardUrl).toBe('http://localhost:41321')
            expect(plugin.options.catalog).toEqual({})
            expect(plugin.getPublishers()).toHaveLength(1)
        })

        it('should create plugin with custom options', () => {
            const plugin = EventCounterPluginFactory({
                enableLogging: true,
                dashboardUrl: 'http://localhost:3000',
                catalog: {
                    'test-event': { description: 'Test event' }
                }
            })

            expect(plugin).toBeInstanceOf(EventCounterPlugin)
            expect(plugin.options.enableLogging).toBe(true)
            expect(plugin.options.dashboardUrl).toBe('http://localhost:3000')
            expect(plugin.options.catalog).toEqual({
                'test-event': { description: 'Test event' }
            })
        })

        it('should merge options with defaults', () => {
            const plugin = EventCounterPluginFactory({
                enableLogging: true
            })

            expect(plugin.options.enableLogging).toBe(true)
            expect(plugin.options.dashboardUrl).toBe('http://localhost:41321')
        })
    })

    describe('EventCounterPlugin', () => {
        it('should initialize with correct options', () => {
            const plugin = new EventCounterPlugin({
                enableLogging: true,
                catalog: testCatalog
            })

            expect(plugin.name).toBe('event-counter')
            expect(plugin.options.enableLogging).toBe(true)
            expect(plugin.options.catalog).toEqual(testCatalog)
            expect(plugin.getPublishers()).toHaveLength(1)
        })

        it('should have a publisher', () => {
            const plugin = new EventCounterPlugin()
            const publishers = plugin.getPublishers()

            expect(publishers).toHaveLength(1)
            expect(publishers[0].name).toBe('eventCounter')
        })

        it('should call onRegister', () => {
            const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => { })
            const plugin = new EventCounterPlugin({ enableLogging: true })

            plugin.onRegister()

            expect(consoleSpy).toHaveBeenCalledWith('[EventCounterPlugin] onRegister called')
            expect(consoleSpy).toHaveBeenCalledWith(
                'EventCounterPlugin registered. Tracking all events with counts.'
            )

            consoleSpy.mockRestore()
        })
    })

    describe('Catalog handling', () => {
        it('should handle catalog when provided', () => {
            const plugin = new EventCounterPlugin({
                enableLogging: true,
                catalog: testCatalog
            })

            expect(plugin.options.catalog).toEqual(testCatalog)
        })

        it('should handle missing catalog', () => {
            const plugin = new EventCounterPlugin({
                enableLogging: true
            })

            expect(plugin.options.catalog).toEqual({})
        })
    })
}) 