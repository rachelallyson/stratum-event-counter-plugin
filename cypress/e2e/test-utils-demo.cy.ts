/**
 * Demo test showing how to use test utilities with GLOBAL run ID
 * This test uses the run ID set by cypress.config.ts, ensuring
 * all tests share the same run ID when running "cypress run"
 */

import {
    resetRunStats,
    getActiveRunId
} from '../../src/test-utils-browser';

describe('Test Utils Demo (Global Run ID)', () => {

    it('should use the global run ID set by cypress.config.ts', async () => {
        // Get the run ID that was set by cypress.config.ts before:run hook
        const runId = await getActiveRunId();
        console.log('🔍 Using global run ID:', runId);

        // Verify the run ID follows the cypress pattern
        expect(runId).to.not.be.null;
        expect(runId).to.include('cypress');

        // Reset stats for this test (optional, for test isolation)
        await resetRunStats();
        console.log('✅ Stats reset for test');

        // Get initial stats (should be empty after reset)
        const statsResponse = await fetch(`http://localhost:41321/api/events-stats?statsId=${runId}`);
        const initialStats = await statsResponse.json();
        expect(initialStats.totalEvents).to.equal(0);
        console.log('✅ Initial stats are empty:', initialStats);

        cy.log(`Using global run ID: ${runId}`);
    });

    it('should track events under the same global run ID', async () => {
        const runId = await getActiveRunId();

        // Reset stats for this test
        await resetRunStats();

        // Simulate some app events (these would normally come from your app)
        await fetch('http://localhost:41321/api/events-stats', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ eventKey: 'demo-event-1', timestamp: new Date().toISOString() })
        });

        await fetch('http://localhost:41321/api/events-stats', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ eventKey: 'demo-event-2', timestamp: new Date().toISOString() })
        });

        // Check that events were tracked under the global run ID
        const statsResponse = await fetch(`http://localhost:41321/api/events-stats?statsId=${runId}`);
        const stats = await statsResponse.json();
        console.log('📊 Event stats:', stats);

        expect(stats.totalEvents).to.equal(2);
        expect(stats.events['demo-event-1']).to.exist;
        expect(stats.events['demo-event-2']).to.exist;

        cy.log(`Events tracked under global run ID: ${runId}`);
    });

    it('should demonstrate proper test isolation with stats reset', async () => {
        const runId = await getActiveRunId();

        // Reset stats to start fresh for this test
        await resetRunStats();

        // Initially should have no events
        let statsResponse = await fetch(`http://localhost:41321/api/events-stats?statsId=${runId}`);
        let stats = await statsResponse.json();
        expect(stats.totalEvents).to.equal(0);

        // Add an event
        await fetch('http://localhost:41321/api/events-stats', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ eventKey: 'isolation-event', timestamp: new Date().toISOString() })
        });

        // Should now have 1 event
        statsResponse = await fetch(`http://localhost:41321/api/events-stats?statsId=${runId}`);
        stats = await statsResponse.json();
        expect(stats.totalEvents).to.equal(1);
        expect(stats.events['isolation-event'].count).to.equal(1);

        cy.log(`Test isolation working with global run ID: ${runId}`);
    });
}); 