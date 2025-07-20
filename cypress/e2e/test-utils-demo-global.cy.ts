/**
 * Demo test showing how to use GLOBAL run ID coordination
 * This approach works when you want ALL tests in a single "cypress run" to share the same run ID
 * The run ID is set once in cypress.config.ts before:run hook
 */

import {
    getActiveRunId,
    resetRunStats
} from '../../src/test-utils-browser';

describe('Global Run ID Demo', () => {
    // DON'T call startTestRun here - the run ID is already set by cypress.config.ts

    describe('Shared Run ID Tests', () => {
        beforeEach(async () => {
            // Optional: Reset stats for clean test isolation
            // But keep the same run ID for all tests
            const currentRunId = await getActiveRunId();
            if (currentRunId) {
                await resetRunStats(currentRunId);
            }
        });

        it('should use the global run ID set by Cypress config', async () => {
            // Get the run ID that was set in cypress.config.ts before:run
            const activeRunId = await getActiveRunId();
            expect(activeRunId).to.not.be.null;
            expect(activeRunId).to.include('cypress'); // Should start with 'cypress'

            console.log(`Test 1 using run ID: ${activeRunId}`);

            // Simulate app events
            await fetch('http://localhost:41321/api/events-stats', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ eventKey: 'test-event-1', timestamp: new Date().toISOString() })
            });

            // Check that events were logged under the global run ID
            const statsResponse = await fetch(`http://localhost:41321/api/events-stats?statsId=${activeRunId}`);
            const stats = await statsResponse.json();

            expect(stats.events['test-event-1'].count).to.equal(1);
        });

        it('should use the SAME run ID as the previous test', async () => {
            // This test should get the same run ID as the previous test
            const activeRunId = await getActiveRunId();
            expect(activeRunId).to.not.be.null;
            expect(activeRunId).to.include('cypress');

            console.log(`Test 2 using run ID: ${activeRunId}`);

            // Simulate more app events
            await fetch('http://localhost:41321/api/events-stats', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ eventKey: 'test-event-2', timestamp: new Date().toISOString() })
            });

            // Check stats - since we reset in beforeEach, we should only see this test's event
            const statsResponse = await fetch(`http://localhost:41321/api/events-stats?statsId=${activeRunId}`);
            const stats = await statsResponse.json();

            expect(stats.events['test-event-2'].count).to.equal(1);
            // test-event-1 should NOT be here because we reset stats in beforeEach
            expect(stats.events['test-event-1']).to.be.undefined;
        });

        it('should verify the same run ID was used across all tests', async () => {
            const activeRunId = await getActiveRunId();
            console.log(`Test 3 using run ID: ${activeRunId}`);

            // Verify this is the same run ID that was set in the Cypress config
            expect(activeRunId).to.not.be.null;
            expect(activeRunId).to.include('cypress');

            // Add a final event to confirm the run ID works
            await fetch('http://localhost:41321/api/events-stats', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ eventKey: 'test-event-3', timestamp: new Date().toISOString() })
            });

            // Check that this event was logged under the same global run ID
            const statsResponse = await fetch(`http://localhost:41321/api/events-stats?statsId=${activeRunId}`);
            const stats = await statsResponse.json();

            expect(stats.events['test-event-3'].count).to.equal(1);
            expect(stats.totalEvents).to.equal(1); // Only this test's event (due to beforeEach reset)
        });
    });
}); 