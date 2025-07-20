/**
 * Example showing how to use test utilities in your app tests
 * This demonstrates the GLOBAL run ID approach where all tests in "cypress run" share the same run ID
 */

import {
    getActiveRunId,
    resetRunStats
} from '../../src/test-utils-browser';

describe('My App Tests', () => {
    let runId: string | null;

    beforeEach(async () => {
        // Get the global run ID that was set in cypress.config.ts
        runId = await getActiveRunId();

        // Optional: Reset stats for clean test isolation (keeps same run ID)
        if (runId) {
            await resetRunStats(runId);
        }
    });

    it('should track events during user interactions', async () => {
        // Verify we have a run ID
        expect(runId).to.not.be.null;
        expect(runId).to.include('cypress');

        // Simulate an app event instead of visiting a page
        await fetch('http://localhost:41321/api/events-stats', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ eventKey: 'user-interaction', timestamp: new Date().toISOString() })
        });

        // Verify events were tracked under the correct run ID
        const statsResponse = await fetch(`http://localhost:41321/api/events-stats?statsId=${runId}`);
        const stats = await statsResponse.json();

        // Check that the event was logged
        expect(stats.totalEvents).to.be.greaterThan(0);
        expect(stats.events['user-interaction'].count).to.equal(1);
    });

    it('should continue using the same run ID', async () => {
        // This test will use the SAME run ID as the previous test
        const currentRunId = await getActiveRunId();
        expect(currentRunId).to.not.be.null;
        expect(currentRunId).to.equal(runId);

        // Simulate another app event
        await fetch('http://localhost:41321/api/events-stats', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ eventKey: 'another-action', timestamp: new Date().toISOString() })
        });

        // All events will be under the same global run ID
        const statsResponse = await fetch(`http://localhost:41321/api/events-stats?statsId=${runId}`);
        const stats = await statsResponse.json();
        expect(stats.events['another-action'].count).to.equal(1);
    });

    it('should accumulate events across tests if you want', async () => {
        // If you DON'T call resetRunStats in beforeEach, 
        // events will accumulate across all tests in this run

        // Remove the resetRunStats call from beforeEach to see this behavior
    });
}); 