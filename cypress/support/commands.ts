// ***********************************************
// This example commands.ts shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************

declare global {
    namespace Cypress {
        interface Chainable {
            /**
             * Custom command to start the event counter server
             * @example cy.startEventCounterServer()
             */
            startEventCounterServer(): Chainable<void>

            /**
             * Custom command to stop the event counter server
             * @example cy.stopEventCounterServer()
             */
            stopEventCounterServer(): Chainable<void>

            /**
             * Custom command to publish an event
             * @example cy.publishEvent('user-login', 'test-run-123')
             */
            publishEvent(eventKey: string, runId?: string): Chainable<void>

            /**
             * Custom command to reset event stats
             * @example cy.resetEventStats()
             */
            resetEventStats(): Chainable<void>

            /**
             * Custom command to get event stats
             * @example cy.getEventStats()
             */
            getEventStats(runId?: string): Chainable<any>

            /**
             * Custom command to get available runs
             * @example cy.getRuns()
             */
            getRuns(): Chainable<any>

            /**
             * Custom command to get event catalog
             * @example cy.getCatalog()
             */
            getCatalog(): Chainable<any>

            /**
             * Custom command to wait for dashboard to be ready
             * @example cy.waitForDashboard()
             */
            waitForDashboard(): Chainable<void>

            /**
             * Custom command to refresh dashboard
             * @example cy.refreshDashboard()
             */
            refreshDashboard(): Chainable<void>

            /**
             * Custom command to cleanup test data
             * @example cy.cleanupTestData()
             */
            cleanupTestData(): Chainable<void>
        }
    }
}

// Start the event counter server
Cypress.Commands.add('startEventCounterServer', () => {
    // This would typically start the server process
    // For now, we'll assume it's already running
    cy.log('Event counter server should be running on http://localhost:41321')
})

// Stop the event counter server
Cypress.Commands.add('stopEventCounterServer', () => {
    // This would typically stop the server process
    cy.log('Event counter server stopped')
})

// Publish an event
Cypress.Commands.add('publishEvent', (eventKey: string, runId?: string) => {
    const url = runId
        ? `/api/events-stats?statsId=${encodeURIComponent(runId)}`
        : '/api/events-stats'

    cy.request({
        method: 'POST',
        url,
        body: {
            eventKey,
            timestamp: new Date().toISOString()
        },
        headers: {
            'Content-Type': 'application/json'
        }
    }).then((response) => {
        expect(response.status).to.eq(200)
        expect(response.body.success).to.be.true
    })
})

// Reset event stats
Cypress.Commands.add('resetEventStats', (runId?: string) => {
    const url = runId
        ? `/api/events-stats?statsId=${encodeURIComponent(runId)}`
        : '/api/events-stats'

    cy.request({
        method: 'PUT',
        url
    }).then((response) => {
        expect(response.status).to.eq(200)
        expect(response.body.success).to.be.true
    })
})

// Get event stats
Cypress.Commands.add('getEventStats', (runId?: string) => {
    const url = runId
        ? `/api/events-stats?statsId=${encodeURIComponent(runId)}`
        : '/api/events-stats'

    return cy.request({
        method: 'GET',
        url
    }).then((response) => {
        expect(response.status).to.eq(200)
        return response.body
    })
})

// Get available runs
Cypress.Commands.add('getRuns', () => {
    return cy.request({
        method: 'GET',
        url: '/api/runs'
    }).then((response) => {
        expect(response.status).to.eq(200)
        return response.body
    })
})

// Get event catalog
Cypress.Commands.add('getCatalog', () => {
    return cy.request({
        method: 'GET',
        url: '/api/catalog'
    }).then((response) => {
        if (response.status === 200) {
            return response.body
        } else {
            return null
        }
    })
})

// Wait for dashboard to be ready
Cypress.Commands.add('waitForDashboard', () => {
    cy.window().should('have.property', 'dashboardReady', true)
    cy.get('#summary', { timeout: 10000 }).should('not.be.empty')
})

// Refresh dashboard
Cypress.Commands.add('refreshDashboard', () => {
    cy.reload()
    cy.waitForDashboard()
})

// Cleanup test data
Cypress.Commands.add('cleanupTestData', () => {
    // Reset default stats
    cy.request({
        method: 'PUT',
        url: '/api/events-stats'
    }).then((response) => {
        expect(response.status).to.eq(200)
    })

    // Clear catalog file
    cy.task('writeFile', {
        path: 'src/data/event-catalog.json',
        content: ''
    })

    // Get all runs and reset each one
    cy.request({
        method: 'GET',
        url: '/api/runs'
    }).then((response) => {
        const runs = response.body
        runs.forEach((run: any) => {
            if (run.id !== 'default') {
                cy.request({
                    method: 'PUT',
                    url: `/api/events-stats?statsId=${run.id}`
                }).then((resetResponse) => {
                    expect(resetResponse.status).to.eq(200)
                })
            }
        })
    })
}) 