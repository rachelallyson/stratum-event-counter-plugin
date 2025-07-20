describe('Cross-Process Run ID Coordination', () => {
    it('should coordinate run IDs between Cypress and Dashboard', () => {
        // Verify Cypress set an active run ID on the dashboard
        cy.getActiveRunId().then((cypressRunId) => {
            expect(cypressRunId).to.not.be.null
            expect(cypressRunId).to.include('cypress-')

            // Verify the dashboard has the same run ID
            cy.request('GET', '/api/active-run-id').then((response) => {
                expect(response.body.runId).to.eq(cypressRunId)
                cy.log(`✅ Coordination working: ${cypressRunId}`)
            })
        })
    })

    it('should demonstrate how Stratum apps would get the run ID', () => {
        // This is what the EventCounterPublisher does
        cy.request('GET', '/api/active-run-id').then((response) => {
            const runId = response.body.runId
            expect(runId).to.include('cypress-')

            // Simulate Stratum plugin publishing an event with this run ID
            cy.request({
                method: 'POST',
                url: `/api/events-stats?statsId=${encodeURIComponent(runId)}`,
                body: {
                    eventKey: 'stratum-app-event',
                    timestamp: new Date().toISOString()
                }
            })

            // Verify the event was recorded under the correct run ID
            cy.request('GET', `/api/events-stats?statsId=${encodeURIComponent(runId)}`).then((stats) => {
                expect(stats.body.events).to.have.property('stratum-app-event')
                expect(stats.body.events['stratum-app-event'].count).to.eq(1)
            })

            cy.log(`✅ Event recorded under run ID: ${runId}`)
        })
    })

    it('should demonstrate run isolation across different runs', () => {
        // Get current run ID
        cy.getActiveRunId().then((originalRunId) => {
            // Change to a different run ID
            const newRunId = `test-isolation-${Date.now()}`
            cy.setActiveRunId(newRunId)

            // Post event to new run
            cy.request({
                method: 'POST',
                url: `/api/events-stats?statsId=${encodeURIComponent(newRunId)}`,
                body: {
                    eventKey: 'isolated-event',
                    timestamp: new Date().toISOString()
                }
            })

            // Verify isolation - event in new run, not in original
            cy.request('GET', `/api/events-stats?statsId=${encodeURIComponent(newRunId)}`).then((newStats) => {
                expect(newStats.body.events).to.have.property('isolated-event')
            })

            cy.request('GET', `/api/events-stats?statsId=${encodeURIComponent(originalRunId)}`).then((originalStats) => {
                expect(originalStats.body.events).to.not.have.property('isolated-event')
            })

            // Restore original run ID for cleanup
            cy.setActiveRunId(originalRunId)
            cy.log(`✅ Run isolation verified between ${originalRunId} and ${newRunId}`)
        })
    })

    it('should explain the workflow for real applications', () => {
        cy.log('🔄 Real Application Workflow:')
        cy.log('1. Cypress starts: generates run-123 and sets it on dashboard')
        cy.log('2. App starts: Stratum plugin asks dashboard for active run ID')
        cy.log('3. Dashboard responds: "run-123"')
        cy.log('4. App publishes events: all go to run-123 automatically')
        cy.log('5. Cypress ends: clears active run ID from dashboard')
        cy.log('6. Next run: gets fresh run-124 and repeats')

        // Demonstrate that this test run has its own ID
        cy.getActiveRunId().then((runId) => {
            cy.log(`✅ This test run ID: ${runId}`)
            cy.log('✅ Next "npx cypress run" will get a completely fresh ID')
        })
    })
}) 