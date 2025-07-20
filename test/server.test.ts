import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest'
import fs from 'fs'
import path from 'path'

// Mock environment variables
const originalEnv = process.env

describe('Server File Operations Tests', () => {
    const testDataDir = path.join(process.cwd(), 'test-data')

    beforeAll(async () => {
        // Set up test environment
        process.env.EVENT_COUNTER_PORT = '41322'
        process.env.EVENT_COUNTER_MAX_RUNS = '5'

        // Create test data directory
        if (!fs.existsSync(testDataDir)) {
            fs.mkdirSync(testDataDir, { recursive: true })
        }
    })

    afterAll(async () => {
        // Clean up test data
        if (fs.existsSync(testDataDir)) {
            fs.rmSync(testDataDir, { recursive: true, force: true })
        }

        // Restore environment
        process.env = originalEnv
    })

    beforeEach(() => {
        // Clear test data before each test
        if (fs.existsSync(testDataDir)) {
            const files = fs.readdirSync(testDataDir)
            files.forEach(file => {
                fs.unlinkSync(path.join(testDataDir, file))
            })
        }
    })

    describe('File Operations', () => {
        it('should create and read event stats files', () => {
            const statsFile = path.join(testDataDir, 'event-stats.json')
            const testStats = {
                events: {
                    'user-login': { count: 5, lastUsed: '2025-01-01T00:00:00.000Z' }
                },
                totalEvents: 5,
                startTime: '2025-01-01T00:00:00.000Z'
            }

            fs.writeFileSync(statsFile, JSON.stringify(testStats))

            expect(fs.existsSync(statsFile)).toBe(true)

            const readStats = JSON.parse(fs.readFileSync(statsFile, 'utf-8'))
            expect(readStats).toEqual(testStats)
        })

        it('should create run-specific stats files', () => {
            const runId = 'test-run-123'
            const statsFile = path.join(testDataDir, `event-stats-${runId}.json`)
            const testStats = {
                events: {
                    'user-login': { count: 3, lastUsed: '2025-01-01T00:00:00.000Z' }
                },
                totalEvents: 3,
                startTime: '2025-01-01T00:00:00.000Z'
            }

            fs.writeFileSync(statsFile, JSON.stringify(testStats))

            expect(fs.existsSync(statsFile)).toBe(true)

            const readStats = JSON.parse(fs.readFileSync(statsFile, 'utf-8'))
            expect(readStats).toEqual(testStats)
        })

        it('should create catalog file', () => {
            const catalogFile = path.join(testDataDir, 'event-catalog.json')
            const catalog = {
                'user-login': { description: 'User logs in' },
                'user-logout': { description: 'User logs out' }
            }

            fs.writeFileSync(catalogFile, JSON.stringify(catalog))

            expect(fs.existsSync(catalogFile)).toBe(true)

            const readCatalog = JSON.parse(fs.readFileSync(catalogFile, 'utf-8'))
            expect(readCatalog).toEqual(catalog)
        })
    })

    describe('Configuration', () => {
        it('should read environment variables correctly', () => {
            expect(process.env.EVENT_COUNTER_PORT).toBe('41322')
            expect(process.env.EVENT_COUNTER_MAX_RUNS).toBe('5')
        })

        it('should validate port configuration', () => {
            const port = parseInt(process.env.EVENT_COUNTER_PORT || '41321', 10)
            expect(port).toBe(41322)
            expect(port).toBeGreaterThan(0)
            expect(port).toBeLessThan(65536)
        })

        it('should validate max runs configuration', () => {
            const maxRuns = parseInt(process.env.EVENT_COUNTER_MAX_RUNS || '25', 10)
            expect(maxRuns).toBe(5)
            expect(maxRuns).toBeGreaterThan(0)
        })
    })

    describe('Run Cleanup Logic', () => {
        it('should identify files for cleanup', () => {
            // Create test run files
            for (let i = 1; i <= 7; i++) {
                const stats = { events: {}, totalEvents: 0, startTime: '2025-01-01T00:00:00.000Z' }
                fs.writeFileSync(path.join(testDataDir, `event-stats-run-${i}.json`), JSON.stringify(stats))
            }

            const files = fs.readdirSync(testDataDir)
            const statsFiles = files.filter(
                (file) => file.startsWith('event-stats-') && file.endsWith('.json') && file !== 'event-stats.json'
            )

            expect(statsFiles.length).toBe(7)
            expect(statsFiles.length).toBeGreaterThan(5) // Max runs limit
        })

        it('should sort files by timestamp for cleanup', () => {
            // Create files with different timestamps
            const files = [
                { name: 'event-stats-run-100.json', timestamp: 100 },
                { name: 'event-stats-run-300.json', timestamp: 300 },
                { name: 'event-stats-run-200.json', timestamp: 200 }
            ]

            files.forEach(({ name }) => {
                const stats = { events: {}, totalEvents: 0, startTime: '2025-01-01T00:00:00.000Z' }
                fs.writeFileSync(path.join(testDataDir, name), JSON.stringify(stats))
            })

            const fileInfos = files.map((file) => {
                const match = /event-stats-(.+)\.json$/.exec(file.name)
                if (match) {
                    const runId = match[1]
                    const timestamp = runId.startsWith('run-') ? parseInt(runId.replace('run-', '')) : 0
                    return { file: file.name, timestamp }
                }
                return { file: file.name, timestamp: 0 }
            })

            // Sort by timestamp (oldest first)
            fileInfos.sort((a, b) => a.timestamp - b.timestamp)

            expect(fileInfos[0].timestamp).toBe(100)
            expect(fileInfos[1].timestamp).toBe(200)
            expect(fileInfos[2].timestamp).toBe(300)
        })
    })
}) 