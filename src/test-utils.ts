/**
 * Test utilities for Stratum Event Counter Plugin
 * 
 * These functions work with any testing framework (Jest, Vitest, Cypress, etc.)
 * 
 * @example
 * ```javascript
 * // Jest/Vitest setup
 * import { setActiveRunId, generateRunId, clearActiveRunId } from '@rachelallyson/stratum-event-counter-plugin/test-utils';
 * 
 * beforeEach(async () => {
 *   const runId = generateRunId();
 *   await setActiveRunId(runId);
 * });
 * 
 * afterEach(async () => {
 *   await clearActiveRunId();
 * });
 * ```
 * 
 * @example
 * ```javascript
 * // Cypress setup
 * import { setActiveRunId, generateRunId, clearActiveRunId } from '@rachelallyson/stratum-event-counter-plugin/test-utils';
 * 
 * beforeEach(() => {
 *   const runId = generateRunId();
 *   cy.wrap(setActiveRunId(runId));
 * });
 * 
 * afterEach(() => {
 *   cy.wrap(clearActiveRunId());
 * });
 * ```
 */

const DEFAULT_DASHBOARD_URL = 'http://localhost:41321';

// Universal fetch function that works in all environments
let universalFetch: typeof fetch;

// Detect environment and set up fetch accordingly
if (typeof window !== 'undefined' && typeof window.fetch !== 'undefined') {
    // Browser environment (Cypress, etc.) - use browser's native fetch
    universalFetch = window.fetch.bind(window);
} else if (typeof globalThis !== 'undefined' && typeof globalThis.fetch !== 'undefined') {
    // Node.js 18+ with global fetch
    universalFetch = globalThis.fetch;
} else {
    // Node.js < 18 - try to use node-fetch
    try {
        const nodeFetch = require('node-fetch');
        universalFetch = nodeFetch.default || nodeFetch;
    } catch (error) {
        // If node-fetch isn't available either, provide a helpful error
        universalFetch = (() => {
            throw new Error(
                'No fetch implementation available. Please ensure you are using Node.js 18+ or install node-fetch: npm install node-fetch'
            );
        }) as any;
    }
}

/**
 * Generate a new run ID for testing
 * @param prefix Optional prefix for the run ID (default: 'test')
 * @returns A unique run ID
 */
export function generateRunId(prefix: string = 'test'): string {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Set the active run ID on the dashboard server
 * This ensures all events without explicit run IDs use this run ID
 * 
 * @param runId The run ID to set as active
 * @param dashboardUrl Optional dashboard URL (default: http://localhost:41321)
 * @returns Promise that resolves when the run ID is set
 */
export async function setActiveRunId(runId: string, dashboardUrl: string = DEFAULT_DASHBOARD_URL): Promise<void> {
    try {
        const response = await universalFetch(`${dashboardUrl}/api/active-run-id`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ runId })
        });

        if (!response.ok) {
            throw new Error(`Failed to set active run ID: ${response.status} ${response.statusText}`);
        }
    } catch (error) {
        throw new Error(`Could not set active run ID "${runId}": ${error}`);
    }
}

/**
 * Clear the active run ID from the dashboard server
 * After this, events without explicit run IDs will use automatic session detection
 * 
 * @param dashboardUrl Optional dashboard URL (default: http://localhost:41321)
 * @returns Promise that resolves when the run ID is cleared
 */
export async function clearActiveRunId(dashboardUrl: string = DEFAULT_DASHBOARD_URL): Promise<void> {
    try {
        const response = await universalFetch(`${dashboardUrl}/api/active-run-id`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            throw new Error(`Failed to clear active run ID: ${response.status} ${response.statusText}`);
        }
    } catch (error) {
        throw new Error(`Could not clear active run ID: ${error}`);
    }
}

/**
 * Get the current active run ID from the dashboard server
 * 
 * @param dashboardUrl Optional dashboard URL (default: http://localhost:41321)
 * @returns Promise that resolves to the current run ID or null if none is set
 */
export async function getActiveRunId(dashboardUrl: string = DEFAULT_DASHBOARD_URL): Promise<string | null> {
    try {
        const response = await universalFetch(`${dashboardUrl}/api/active-run-id`);

        if (!response.ok) {
            if (response.status === 404) {
                return null; // No active run ID
            }
            throw new Error(`Failed to get active run ID: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        return data.runId || null;
    } catch (error) {
        throw new Error(`Could not get active run ID: ${error}`);
    }
}

/**
 * Reset statistics for a specific run ID
 * This clears all event counts for the specified run
 * 
 * @param runId Optional run ID to reset (if not provided, uses current active run ID)
 * @param dashboardUrl Optional dashboard URL (default: http://localhost:41321)
 * @returns Promise that resolves when the stats are reset
 */
export async function resetRunStats(runId?: string, dashboardUrl: string = DEFAULT_DASHBOARD_URL): Promise<void> {
    try {
        const url = runId
            ? `${dashboardUrl}/api/events-stats/reset?statsId=${runId}`
            : `${dashboardUrl}/api/events-stats/reset`;

        const response = await universalFetch(url, { method: 'POST' });

        if (!response.ok) {
            throw new Error(`Failed to reset stats: ${response.status} ${response.statusText}`);
        }
    } catch (error) {
        throw new Error(`Could not reset run stats: ${error}`);
    }
}

/**
 * Convenience function to start a new test run
 * This generates a new run ID, sets it as active, and optionally resets its stats
 * 
 * @param options Configuration options
 * @param options.prefix Prefix for the generated run ID (default: 'test')
 * @param options.resetStats Whether to reset stats for this run (default: true)
 * @param options.dashboardUrl Dashboard URL (default: http://localhost:41321)
 * @returns Promise that resolves to the new run ID
 */
export async function startTestRun(options: {
    prefix?: string;
    resetStats?: boolean;
    dashboardUrl?: string;
} = {}): Promise<string> {
    const {
        prefix = 'test',
        resetStats = true,
        dashboardUrl = DEFAULT_DASHBOARD_URL
    } = options;

    const runId = generateRunId(prefix);
    await setActiveRunId(runId, dashboardUrl);

    if (resetStats) {
        await resetRunStats(runId, dashboardUrl);
    }

    return runId;
}

/**
 * Convenience function to end a test run
 * This clears the active run ID
 * 
 * @param dashboardUrl Optional dashboard URL (default: http://localhost:41321)
 * @returns Promise that resolves when the run is ended
 */
export async function endTestRun(dashboardUrl: string = DEFAULT_DASHBOARD_URL): Promise<void> {
    await clearActiveRunId(dashboardUrl);
} 