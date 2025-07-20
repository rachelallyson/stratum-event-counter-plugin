// Test setup file for Vitest
import { beforeAll, afterAll } from 'vitest'
import fs from 'fs'
import path from 'path'

// Clean up test data before and after tests
const testDataDir = path.join(process.cwd(), 'test-data')

beforeAll(() => {
    // Create test data directory
    if (!fs.existsSync(testDataDir)) {
        fs.mkdirSync(testDataDir, { recursive: true })
    }
})

afterAll(() => {
    // Clean up test data directory
    if (fs.existsSync(testDataDir)) {
        fs.rmSync(testDataDir, { recursive: true, force: true })
    }
}) 