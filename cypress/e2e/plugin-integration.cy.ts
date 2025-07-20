describe('Plugin Integration Tests', () => {
    beforeEach(() => {
        // Reset stats before each test
        cy.request({
            method: 'PUT',
            url: '/api/events-stats'
        })
    })

    describe('Basic Plugin Usage', () => {
        it('should handle basic event publishing workflow', () => {
            // Simulate the basic workflow from README
            const eventCatalog = {
                "user-login": { description: "User logs in" },
                "user-logout": { description: "User logs out" },
                "page-view": { description: "User views a page" }
            };

            // Publish events as a developer would
            cy.request({
                method: 'POST',
                url: '/api/events-stats',
                body: {
                    eventKey: 'user-login',
                    timestamp: new Date().toISOString()
                },
                headers: {
                    'Content-Type': 'application/json'
                }
            }).then((response) => {
                expect(response.status).to.eq(200)
            })

            cy.request({
                method: 'POST',
                url: '/api/events-stats',
                body: {
                    eventKey: 'page-view',
                    timestamp: new Date().toISOString()
                },
                headers: {
                    'Content-Type': 'application/json'
                }
            }).then((response) => {
                expect(response.status).to.eq(200)
            })

            // Verify events are tracked
            cy.request({
                method: 'GET',
                url: '/api/events-stats'
            }).then((response) => {
                expect(response.status).to.eq(200)
                expect(response.body.totalEvents).to.eq(2)
                expect(response.body.events['user-login']).to.exist
                expect(response.body.events['page-view']).to.exist
            })
        })

        it('should handle multiple events of the same type', () => {
            // Publish the same event multiple times (common in development)
            for (let i = 0; i < 5; i++) {
                cy.request({
                    method: 'POST',
                    url: '/api/events-stats',
                    body: {
                        eventKey: 'user-login',
                        timestamp: new Date().toISOString()
                    },
                    headers: {
                        'Content-Type': 'application/json'
                    }
                })
            }

            // Verify count is correct
            cy.request({
                method: 'GET',
                url: '/api/events-stats'
            }).then((response) => {
                expect(response.body.events['user-login'].count).to.eq(5)
                expect(response.body.totalEvents).to.eq(5)
            })
        })
    })

    describe('Development Workflow Scenarios', () => {
        it('should handle rapid development iteration', () => {
            // Simulate rapid development where events are published quickly
            const events = ['user-login', 'page-view', 'button-click', 'form-submit'];

            events.forEach((eventKey, index) => {
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
            });

            // Verify all events are tracked
            cy.request({
                method: 'GET',
                url: '/api/events-stats'
            }).then((response) => {
                expect(response.body.totalEvents).to.eq(4)
                events.forEach(eventKey => {
                    expect(response.body.events[eventKey]).to.exist
                })
            })
        })

        it('should handle development with custom port configuration', () => {
            // Test the custom port scenario from README
            // This would normally be tested with a different server instance
            // For now, we'll test the API endpoints work correctly

            cy.request({
                method: 'POST',
                url: '/api/events-stats',
                body: {
                    eventKey: 'custom-port-test',
                    timestamp: new Date().toISOString()
                },
                headers: {
                    'Content-Type': 'application/json'
                }
            }).then((response) => {
                expect(response.status).to.eq(200)
            })

            // Verify the event is tracked
            cy.request({
                method: 'GET',
                url: '/api/events-stats'
            }).then((response) => {
                expect(response.body.events['custom-port-test']).to.exist
            })
        })
    })

    describe('Testing Workflow Scenarios', () => {
        it('should handle browser testing scenarios', () => {
            // Simulate browser testing where events are published from tests
            const testEvents = ['test-start', 'test-step-1', 'test-step-2', 'test-complete'];

            testEvents.forEach(eventKey => {
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
            });

            // Verify test events are tracked
            cy.request({
                method: 'GET',
                url: '/api/events-stats'
            }).then((response) => {
                expect(response.body.totalEvents).to.eq(4)
                testEvents.forEach(eventKey => {
                    expect(response.body.events[eventKey]).to.exist
                })
            })
        })

        it('should handle test isolation with run-specific stats', () => {
            const testRunId = 'test-run-isolation';

            // Reset default stats first
            cy.request({
                method: 'PUT',
                url: '/api/events-stats'
            }).then((response) => {
                expect(response.status).to.eq(200)
            })

            // Publish events to a specific test run
            cy.request({
                method: 'POST',
                url: `/api/events-stats?statsId=${testRunId}`,
                body: {
                    eventKey: 'test-event',
                    timestamp: new Date().toISOString()
                },
                headers: {
                    'Content-Type': 'application/json'
                }
            }).then((response) => {
                expect(response.status).to.eq(200)
            })

            // Small delay to ensure file is written
            cy.wait(100)

            // Verify run-specific stats
            cy.request({
                method: 'GET',
                url: `/api/events-stats?statsId=${testRunId}`
            }).then((response) => {
                expect(response.body.totalEvents).to.eq(1)
                expect(response.body.events).to.have.property('test-event')
            })

            // Verify default stats are not affected
            cy.request({
                method: 'GET',
                url: '/api/events-stats'
            }).then((response) => {
                expect(response.body.totalEvents).to.eq(0)
            })
        })
    })

    describe('Configuration Validation', () => {
        it('should handle missing eventKey gracefully', () => {
            cy.request({
                method: 'POST',
                url: '/api/events-stats',
                body: {
                    timestamp: new Date().toISOString()
                },
                headers: {
                    'Content-Type': 'application/json'
                },
                failOnStatusCode: false
            }).then((response) => {
                expect(response.status).to.eq(400)
                expect(response.body.error).to.include('eventKey is required')
            })
        })

        it('should handle invalid eventKey types', () => {
            cy.request({
                method: 'POST',
                url: '/api/events-stats',
                body: {
                    eventKey: 123, // Invalid type
                    timestamp: new Date().toISOString()
                },
                headers: {
                    'Content-Type': 'application/json'
                },
                failOnStatusCode: false
            }).then((response) => {
                expect(response.status).to.eq(400)
                expect(response.body.error).to.include('eventKey is required and must be a string')
            })
        })

        it('should handle empty request body', () => {
            cy.request({
                method: 'POST',
                url: '/api/events-stats',
                body: {},
                headers: {
                    'Content-Type': 'application/json'
                },
                failOnStatusCode: false
            }).then((response) => {
                expect(response.status).to.eq(400)
            })
        })
    })

    describe('Dashboard Integration', () => {
        it('should provide dashboard data for development', () => {
            // Publish some events
            cy.request({
                method: 'POST',
                url: '/api/events-stats',
                body: {
                    eventKey: 'dashboard-test',
                    timestamp: new Date().toISOString()
                },
                headers: {
                    'Content-Type': 'application/json'
                }
            })

            // Verify dashboard endpoints work
            cy.request({
                method: 'GET',
                url: '/api/events-stats'
            }).then((response) => {
                expect(response.status).to.eq(200)
                expect(response.body).to.have.property('events')
                expect(response.body).to.have.property('totalEvents')
                expect(response.body).to.have.property('startTime')
            })

            cy.request({
                method: 'GET',
                url: '/api/runs'
            }).then((response) => {
                expect(response.status).to.eq(200)
                expect(response.body).to.be.an('array')
            })
        })

        it('should handle catalog integration', () => {
            const catalog = {
                'catalog-event': { description: 'Event from catalog' }
            };

            // Write catalog file
            cy.task('writeFile', {
                path: 'src/data/event-catalog.json',
                content: JSON.stringify(catalog)
            })

            // Verify catalog endpoint
            cy.request({
                method: 'GET',
                url: '/api/catalog'
            }).then((response) => {
                expect(response.status).to.eq(200)
                expect(response.body).to.deep.equal(catalog)
            })
        })
    })

    describe('Development Debugging Features', () => {
        it('should provide detailed error messages for debugging', () => {
            cy.request({
                method: 'POST',
                url: '/api/events-stats',
                body: 'invalid json',
                headers: {
                    'Content-Type': 'application/json'
                },
                failOnStatusCode: false
            }).then((response) => {
                expect(response.status).to.eq(400)
                expect(response.body.error).to.exist
            })
        })

        it('should handle file system operations gracefully', () => {
            // Test that the server handles file operations correctly
            cy.request({
                method: 'PUT',
                url: '/api/events-stats'
            }).then((response) => {
                expect(response.status).to.eq(200)
            })

            // Verify stats are reset
            cy.request({
                method: 'GET',
                url: '/api/events-stats'
            }).then((response) => {
                expect(response.body.totalEvents).to.eq(0)
                expect(response.body.events).to.deep.equal({})
            })
        })
    })
}) 