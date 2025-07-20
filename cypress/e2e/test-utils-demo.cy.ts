/**
 * Demo test showing how to use the test utilities
 * This approach works with any testing framework (Jest, Vitest, Cypress, etc.)
 */

import {
    startTestRun,
    endTestRun,
    getActiveRunId,
    generateRunId,
    setActiveRunId,
    clearActiveRunId
} from '../../src/test-utils-browser';

describe('Test Utils Demo', () => {
    // Simple approach: just use startTestRun and endTestRun
    describe('Simple Setup', () => {
        let currentRunId: string;

        beforeEach(async () => {
            // Start a new test run with automatic run ID generation and stats reset
            currentRunId = await startTestRun({ prefix: 'cypress-simple' });
        });

        afterEach(async () => {
            // End the test run (clears active run ID)
            await endTestRun();
        });

        it('should coordinate events under the same run ID', async () => {
            // Verify the run ID is set
            const activeRunId = await getActiveRunId();
            expect(activeRunId).to.equal(currentRunId);
            expect(activeRunId).to.include('cypress-simple');

            // Simulate app events (these would normally come from your app)
            await fetch('http://localhost:41321/api/events-stats', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ eventKey: 'test-event-1', timestamp: new Date().toISOString() })
            });

            await fetch('http://localhost:41321/api/events-stats', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ eventKey: 'test-event-2', timestamp: new Date().toISOString() })
            });

            // Check that events were logged under the correct run ID
            const statsResponse = await fetch(`http://localhost:41321/api/events-stats?statsId=${currentRunId}`);
            const stats = await statsResponse.json();

            expect(stats.totalEvents).to.equal(2);
            expect(stats.events['test-event-1'].count).to.equal(1);
            expect(stats.events['test-event-2'].count).to.equal(1);
        });
    });

    // Manual approach: more control over each step
    describe('Manual Setup', () => {
        it('should allow manual run ID management', async () => {
            const runId = generateRunId('manual-test');

            // Set the run ID manually
            await setActiveRunId(runId);

            // Verify it's set
            const activeRunId = await getActiveRunId();
            expect(activeRunId).to.equal(runId);

            // Simulate an event
            await fetch('http://localhost:41321/api/events-stats', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ eventKey: 'manual-event', timestamp: new Date().toISOString() })
            });

            // Check stats
            const statsResponse = await fetch(`http://localhost:41321/api/events-stats?statsId=${runId}`);
            const stats = await statsResponse.json();
            expect(stats.events['manual-event'].count).to.equal(1);

            // Clear the run ID
            await clearActiveRunId();

            // Verify it's cleared
            const clearedRunId = await getActiveRunId();
            expect(clearedRunId).to.be.null;
        });
    });

    // Test isolation between runs
    describe('Run Isolation', () => {
        it('should isolate events between different run IDs', async () => {
            // First run
            const runId1 = await startTestRun({ prefix: 'isolation-1' });

            await fetch('http://localhost:41321/api/events-stats', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ eventKey: 'isolation-event', timestamp: new Date().toISOString() })
            });

            await endTestRun();

            // Second run
            const runId2 = await startTestRun({ prefix: 'isolation-2' });

            await fetch('http://localhost:41321/api/events-stats', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ eventKey: 'isolation-event', timestamp: new Date().toISOString() })
            });

            await endTestRun();

            // Verify isolation: each run should have 1 event
            const stats1Response = await fetch(`http://localhost:41321/api/events-stats?statsId=${runId1}`);
            const stats1 = await stats1Response.json();
            expect(stats1.totalEvents).to.equal(1);

            const stats2Response = await fetch(`http://localhost:41321/api/events-stats?statsId=${runId2}`);
            const stats2 = await stats2Response.json();
            expect(stats2.totalEvents).to.equal(1);

            // Verify they're different run IDs
            expect(runId1).to.not.equal(runId2);
        });
    });
}); 