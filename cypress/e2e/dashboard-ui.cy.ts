describe('Dashboard UI - Developer Experience', () => {
    beforeEach(() => {
        // Reset stats before each test
        cy.request({
            method: 'PUT',
            url: '/api/events-stats'
        })

        // Visit the dashboard
        cy.visit('/')

        // Wait for the dashboard to be ready and loaded
        cy.window().should('have.property', 'dashboardReady', true)
        cy.get('#summary', { timeout: 10000 }).should('not.be.empty')

        // Wait for initial data to load (but don't require table rows to exist)
        cy.get('table tbody', { timeout: 5000 }).should('exist')
    })

    describe('Dashboard Loading and Display', () => {
        it('should load dashboard with proper title and structure', () => {
            // Check the dashboard loads with correct title
            cy.get('h1').should('contain', 'Event Counter Plugin Dashboard')

            // Check essential UI elements exist
            cy.get('#runSelect').should('exist')
            cy.get('#search').should('exist')
            cy.get('button').contains('Refresh').should('exist')
            cy.get('button').contains('Reset Stats').should('exist')
            cy.get('button').contains('Download CSV').should('exist')
            cy.get('button').contains('Download JSON').should('exist')

            // Check table structure
            cy.get('table').should('exist')
            cy.get('table thead tr th').should('contain', 'Event Key')
            cy.get('table thead tr th').should('contain', 'Description')
            cy.get('table thead tr th').should('contain', 'Count')
            cy.get('table thead tr th').should('contain', 'First Used')
            cy.get('table thead tr th').should('contain', 'Last Used')
        })

        it('should display empty state correctly for new development session', () => {
            // Check empty state
            cy.get('[data-testid="total-events"]').should('contain', '0')

            // Summary should show 0 events
            cy.get('#summary').should('contain', 'Total Events Published: 0')
        })
    })

    describe('Event Display and Tracking', () => {
        it('should display events as they are published during development', () => {
            // Publish events as a developer would during development
            cy.request({
                method: 'POST',
                url: '/api/events-stats',
                body: {
                    eventKey: 'dev-event-1',
                    timestamp: new Date().toISOString()
                },
                headers: {
                    'Content-Type': 'application/json'
                }
            })

            cy.request({
                method: 'POST',
                url: '/api/events-stats',
                body: {
                    eventKey: 'dev-event-2',
                    timestamp: new Date().toISOString()
                },
                headers: {
                    'Content-Type': 'application/json'
                }
            })

            // Refresh dashboard to see new events
            cy.get('button').contains('Refresh').click()
            cy.get('#summary', { timeout: 10000 }).should('not.be.empty')

            // Check events are displayed
            cy.get('table tbody tr', { timeout: 5000 }).should('contain', 'dev-event-1')
            cy.get('table tbody tr').should('contain', 'dev-event-2')
            cy.get('[data-testid="total-events"]').should('contain', '2')
        })

        it('should show event counts and timestamps for debugging', () => {
            // Publish an event with specific timestamp
            const timestamp = new Date().toISOString()
            cy.request({
                method: 'POST',
                url: '/api/events-stats',
                body: {
                    eventKey: 'timestamp-test',
                    timestamp
                },
                headers: {
                    'Content-Type': 'application/json'
                }
            })

            // Refresh dashboard
            cy.get('button').contains('Refresh').click()
            cy.get('#summary', { timeout: 10000 }).should('not.be.empty')

            // Check event details are displayed
            cy.get('table tbody tr', { timeout: 5000 }).should('contain', 'timestamp-test')
            cy.get('table tbody tr').should('contain', '1') // count
            cy.get('table tbody tr').should('contain', timestamp.substring(0, 10)) // date part
        })
    })

    describe('Development Workflow Features', () => {
        it('should support manual refresh for development debugging', () => {
            // Publish an event
            cy.request({
                method: 'POST',
                url: '/api/events-stats',
                body: {
                    eventKey: 'refresh-test',
                    timestamp: new Date().toISOString()
                },
                headers: {
                    'Content-Type': 'application/json'
                }
            })

            // Click refresh button
            cy.get('button').contains('Refresh').click()

            // Wait for refresh
            cy.wait(1000)

            // Check event appears
            cy.get('table tbody tr', { timeout: 5000 }).should('contain', 'refresh-test')
        })

        it('should support stats reset for clean development sessions', () => {
            // Publish some events
            cy.request({
                method: 'POST',
                url: '/api/events-stats',
                body: {
                    eventKey: 'reset-test',
                    timestamp: new Date().toISOString()
                },
                headers: {
                    'Content-Type': 'application/json'
                }
            })

            // Refresh to see the event
            cy.get('button').contains('Refresh').click()
            cy.get('#summary', { timeout: 10000 }).should('not.be.empty')
            cy.get('table tbody tr', { timeout: 5000 }).should('contain', 'reset-test')

            // Click reset button (this will trigger a confirmation dialog)
            cy.get('button').contains('Reset Stats').click()

            // Handle confirmation dialog
            cy.on('window:confirm', () => true)

            // Wait for reset
            cy.wait(1000)

            // Check stats are reset
            cy.get('[data-testid="total-events"]').should('contain', '0')
        })

        it('should support search for finding specific events during development', () => {
            // Publish events with different names
            const events = ['user-login', 'user-logout', 'page-view', 'button-click']

            events.forEach(eventKey => {
                cy.request({
                    method: 'POST',
                    url: '/api/events-stats',
                    body: {
                        eventKey,
                        timestamp: new Date().toISOString()
                    },
                    headers: {
                        'Content-Type': 'application/json'
                    }
                })
            })

            // Refresh dashboard
            cy.get('button').contains('Refresh').click()
            cy.get('#summary', { timeout: 10000 }).should('not.be.empty')

            // Test search functionality
            cy.get('#search').type('user')
            cy.wait(500)

            // Should show only user events
            cy.get('table tbody tr:visible').should('contain', 'user-login')
            cy.get('table tbody tr:visible').should('contain', 'user-logout')
            cy.get('table tbody tr:visible').should('not.contain', 'page-view')
        })
    })

    describe('Export Features for Development Analysis', () => {
        it('should support CSV export for development analysis', () => {
            // Publish some events
            cy.request({
                method: 'POST',
                url: '/api/events-stats',
                body: {
                    eventKey: 'export-test',
                    timestamp: new Date().toISOString()
                },
                headers: {
                    'Content-Type': 'application/json'
                }
            })

            // Refresh dashboard
            cy.get('button').contains('Refresh').click()
            cy.get('#summary', { timeout: 10000 }).should('not.be.empty')

            // Test CSV download button exists and is clickable
            cy.get('button').contains('Download CSV').should('be.visible')
            cy.get('button').contains('Download CSV').click()

            // Note: We can't easily test the actual download in Cypress
            // But we can verify the button works
        })

        it('should support JSON export for development debugging', () => {
            // Publish some events
            cy.request({
                method: 'POST',
                url: '/api/events-stats',
                body: {
                    eventKey: 'json-export-test',
                    timestamp: new Date().toISOString()
                },
                headers: {
                    'Content-Type': 'application/json'
                }
            })

            // Refresh dashboard
            cy.get('button').contains('Refresh').click()
            cy.get('#summary', { timeout: 10000 }).should('not.be.empty')

            // Test JSON download button exists and is clickable
            cy.get('button').contains('Download JSON').should('be.visible')
            cy.get('button').contains('Download JSON').click()

            // Note: We can't easily test the actual download in Cypress
            // But we can verify the button works
        })
    })

    describe('Run Management for Development Workflows', () => {
        it('should support run switching for different development scenarios', () => {
            // Create events in different runs
            cy.request({
                method: 'POST',
                url: '/api/events-stats?statsId=dev-run-1',
                body: {
                    eventKey: 'run-1-event',
                    timestamp: new Date().toISOString()
                },
                headers: {
                    'Content-Type': 'application/json'
                }
            })

            cy.request({
                method: 'POST',
                url: '/api/events-stats?statsId=dev-run-2',
                body: {
                    eventKey: 'run-2-event',
                    timestamp: new Date().toISOString()
                },
                headers: {
                    'Content-Type': 'application/json'
                }
            })

            // Refresh dashboard
            cy.get('button').contains('Refresh').click()
            cy.get('#summary', { timeout: 10000 }).should('not.be.empty')

            // Check that runs are available in dropdown
            cy.get('#runSelect', { timeout: 5000 }).should('contain', 'dev-run-1')
            cy.get('#runSelect').should('contain', 'dev-run-2')

            // Switch to run-1
            cy.get('#runSelect').select('dev-run-1')
            cy.wait(1000)
            cy.get('table tbody tr').should('contain', 'run-1-event')
            cy.get('table tbody tr').should('not.contain', 'run-2-event')

            // Switch to run-2
            cy.get('#runSelect').select('dev-run-2')
            cy.wait(1000)
            cy.get('table tbody tr').should('contain', 'run-2-event')
            cy.get('table tbody tr').should('not.contain', 'run-1-event')
        })
    })

    describe('Catalog Integration for Development', () => {
        it('should display catalog events with descriptions for development guidance', () => {
            // Create a catalog with descriptions via API
            const catalog = {
                'catalog-event-1': { description: 'First catalog event for development' },
                'catalog-event-2': { description: 'Second catalog event for development' }
            }

            // Post catalog via API
            cy.request({
                method: 'POST',
                url: '/api/catalog',
                body: catalog,
                headers: {
                    'Content-Type': 'application/json'
                }
            }).then((response) => {
                expect(response.status).to.eq(200)
            })

            // Refresh dashboard
            cy.get('button').contains('Refresh').click()
            cy.get('#summary', { timeout: 10000 }).should('not.be.empty')

            // Check catalog events are displayed with descriptions
            cy.get('table tbody tr', { timeout: 5000 }).should('contain', 'catalog-event-1')
            cy.get('table tbody tr').should('contain', 'First catalog event for development')
            cy.get('table tbody tr').should('contain', 'catalog-event-2')
            cy.get('table tbody tr').should('contain', 'Second catalog event for development')
        })

        it('should handle events not in catalog (common in development)', () => {
            // Publish an event that's not in the catalog
            cy.request({
                method: 'POST',
                url: '/api/events-stats',
                body: {
                    eventKey: 'new-dev-event',
                    timestamp: new Date().toISOString()
                },
                headers: {
                    'Content-Type': 'application/json'
                }
            })

            // Refresh dashboard
            cy.get('button').contains('Refresh').click()
            cy.get('#summary', { timeout: 10000 }).should('not.be.empty')

            // Check the event is displayed (even without catalog description)
            cy.get('table tbody tr', { timeout: 5000 }).should('contain', 'new-dev-event')
            cy.get('[data-testid="total-events"]').should('contain', '1')
        })
    })
}) 