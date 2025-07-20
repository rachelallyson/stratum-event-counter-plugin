describe('Event Counter API Tests', () => {
    beforeEach(() => {
        // Comprehensive cleanup before each test
        // Reset default stats
        cy.request({
            method: 'PUT',
            url: '/api/events-stats'
        })

        // Clear catalog file
        cy.task('writeFile', {
            path: 'src/data/event-catalog.json',
            content: ''
        })

        // Reset default stats
        cy.request({
            method: 'PUT',
            url: '/api/events-stats'
        })

        // Clean up any test-specific runs that might have been created
        cy.request({
            method: 'GET',
            url: '/api/runs'
        }).then((response) => {
            const runs = response.body
            runs.forEach((run: any) => {
                if (run.id !== 'default' && (run.id.includes('test-') || run.id.includes('sort-test-'))) {
                    cy.request({
                        method: 'PUT',
                        url: `/api/events-stats?statsId=${run.id}`
                    })
                }
            })
        })
    })

    describe('GET /api/events-stats', () => {
        it('should return empty stats when no events exist', () => {
            cy.request({
                method: 'GET',
                url: '/api/events-stats'
            }).then((response) => {
                expect(response.status).to.eq(200)
                expect(response.body.events).to.deep.equal({})
                expect(response.body.startTime).to.be.a('string')
                expect(response.body.totalEvents).to.eq(0)
            })
        })

        it('should return stats for specific run', () => {
            const runId = 'test-run-api-simple'

            // Reset default stats first to ensure clean state
            cy.request({
                method: 'PUT',
                url: '/api/events-stats'
            }).then((response) => {
                expect(response.status).to.eq(200)
            })

            // Publish an event to a specific run
            cy.request({
                method: 'POST',
                url: `/api/events-stats?statsId=${runId}`,
                body: {
                    eventKey: 'api-test-event',
                    timestamp: new Date().toISOString()
                },
                headers: {
                    'Content-Type': 'application/json'
                }
            }).then((response) => {
                expect(response.status).to.eq(200)
                expect(response.body.success).to.be.true
            })

            // Small delay to ensure file is written
            cy.wait(100)

            // Get stats for that run
            cy.request({
                method: 'GET',
                url: `/api/events-stats?statsId=${runId}`
            }).then((response) => {
                expect(response.status).to.eq(200)
                expect(response.body.totalEvents).to.eq(1)
                expect(response.body.events).to.have.property('api-test-event')
                expect(response.body.events['api-test-event'].count).to.eq(1)
            })
        })

        it('should return default stats when run does not exist', () => {
            cy.request({
                method: 'GET',
                url: '/api/events-stats?statsId=non-existent-run'
            }).then((response) => {
                expect(response.status).to.eq(200)
                expect(response.body.totalEvents).to.eq(0)
                expect(response.body.events).to.deep.equal({})
            })
        })
    })

    describe('POST /api/events-stats', () => {
        it('should create new event', () => {
            cy.request({
                method: 'POST',
                url: '/api/events-stats',
                body: {
                    eventKey: 'new-event',
                    timestamp: new Date().toISOString()
                },
                headers: {
                    'Content-Type': 'application/json'
                }
            }).then((response) => {
                expect(response.status).to.eq(200)
                expect(response.body.success).to.be.true
            })

            // Verify the event was created
            cy.request({
                method: 'GET',
                url: '/api/events-stats'
            }).then((response) => {
                expect(response.body.totalEvents).to.eq(1)
                expect(response.body.events['new-event']).to.exist
            })
        })

        it('should increment existing event count', () => {
            // Create event first time
            cy.request({
                method: 'POST',
                url: '/api/events-stats',
                body: {
                    eventKey: 'increment-test',
                    timestamp: new Date().toISOString()
                },
                headers: {
                    'Content-Type': 'application/json'
                }
            })

            // Increment the same event
            cy.request({
                method: 'POST',
                url: '/api/events-stats',
                body: {
                    eventKey: 'increment-test',
                    timestamp: new Date().toISOString()
                },
                headers: {
                    'Content-Type': 'application/json'
                }
            })

            // Verify the count is 2
            cy.request({
                method: 'GET',
                url: '/api/events-stats'
            }).then((response) => {
                expect(response.body.totalEvents).to.eq(2)
                expect(response.body.events['increment-test'].count).to.eq(2)
            })
        })

        it('should handle missing eventKey', () => {
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

        it('should handle missing timestamp', () => {
            cy.request({
                method: 'POST',
                url: '/api/events-stats',
                body: {
                    eventKey: 'no-timestamp'
                },
                headers: {
                    'Content-Type': 'application/json'
                }
            }).then((response) => {
                expect(response.status).to.eq(200)
                expect(response.body.success).to.be.true
            })
        })

        it('should handle invalid JSON', () => {
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
            })
        })

        it('should handle empty body', () => {
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
                expect(response.body.error).to.exist
            })
        })
    })

    describe('PUT /api/events-stats', () => {
        it('should reset default stats', () => {
            // Create some events first
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

            // Reset stats
            cy.request({
                method: 'PUT',
                url: '/api/events-stats'
            }).then((response) => {
                expect(response.status).to.eq(200)
                expect(response.body.success).to.be.true
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

        it('should reset specific run stats', () => {
            const runId = 'reset-run-test'

            // Create events in specific run
            cy.request({
                method: 'POST',
                url: `/api/events-stats?statsId=${runId}`,
                body: {
                    eventKey: 'reset-run-event',
                    timestamp: new Date().toISOString()
                },
                headers: {
                    'Content-Type': 'application/json'
                }
            })

            // Reset specific run
            cy.request({
                method: 'PUT',
                url: `/api/events-stats?statsId=${runId}`
            }).then((response) => {
                expect(response.status).to.eq(200)
                expect(response.body.success).to.be.true
            })

            // Verify specific run is reset
            cy.request({
                method: 'GET',
                url: `/api/events-stats?statsId=${runId}`
            }).then((response) => {
                expect(response.body.totalEvents).to.eq(0)
                expect(response.body.events).to.deep.equal({})
            })
        })
    })

    describe('GET /api/runs', () => {
        it('should return empty runs list initially', () => {
            cy.request({
                method: 'GET',
                url: '/api/runs'
            }).then((response) => {
                expect(response.status).to.eq(200)
                expect(response.body).to.be.an('array')
                expect(response.body.length).to.be.at.least(1) // Should have default run
            })
        })

        it('should return all runs after creating multiple runs', () => {
            const timestamp = Date.now()
            const runIds = [`run-${timestamp}-1`, `run-${timestamp}-2`, `run-${timestamp}-3`]

            // Create multiple runs
            for (let i = 0; i < 3; i++) {
                cy.request({
                    method: 'POST',
                    url: `/api/events-stats?statsId=${runIds[i]}`,
                    body: {
                        eventKey: `event-${i}`,
                        timestamp: new Date().toISOString()
                    },
                    headers: {
                        'Content-Type': 'application/json'
                    }
                })
            }

            // Get all runs
            cy.request({
                method: 'GET',
                url: '/api/runs'
            }).then((response) => {
                expect(response.status).to.eq(200)
                expect(response.body).to.be.an('array')
                expect(response.body.length).to.be.at.least(4) // 3 runs + default

                // Check that all runs are present
                const responseRunIds = response.body.map((run: any) => run.id)
                expect(responseRunIds).to.include('default')
                expect(responseRunIds).to.include(runIds[0])
                expect(responseRunIds).to.include(runIds[1])
                expect(responseRunIds).to.include(runIds[2])
            })
        })

        it('should sort runs by most recent first', () => {
            const timestamp = Date.now()
            const oldRunId = `sort-test-old-${timestamp}`
            const newRunId = `sort-test-new-${timestamp + 1000}` // Ensure different timestamp

            // Create runs with delays to ensure different timestamps
            cy.request({
                method: 'POST',
                url: `/api/events-stats?statsId=${oldRunId}`,
                body: {
                    eventKey: 'old-event',
                    timestamp: new Date().toISOString()
                },
                headers: {
                    'Content-Type': 'application/json'
                }
            }).then((response) => {
                expect(response.status).to.eq(200)
            })

            cy.wait(1000)

            cy.request({
                method: 'POST',
                url: `/api/events-stats?statsId=${newRunId}`,
                body: {
                    eventKey: 'new-event',
                    timestamp: new Date().toISOString()
                },
                headers: {
                    'Content-Type': 'application/json'
                }
            }).then((response) => {
                expect(response.status).to.eq(200)
            })

            // Small delay to ensure files are written
            cy.wait(100)

            // Get runs and check sorting
            cy.request({
                method: 'GET',
                url: '/api/runs'
            }).then((response) => {
                expect(response.status).to.eq(200)
                const runs = response.body

                // Find the indices of our runs
                const oldRunIndex = runs.findIndex((run: any) => run.id === oldRunId)
                const newRunIndex = runs.findIndex((run: any) => run.id === newRunId)

                // Both runs should exist
                expect(oldRunIndex).to.be.greaterThan(-1)
                expect(newRunIndex).to.be.greaterThan(-1)

                // New run should come before old run (most recent first)
                expect(newRunIndex).to.be.lessThan(oldRunIndex)
            })
        })
    })

    describe('GET /api/catalog', () => {
        it('should return 404 when catalog does not exist', () => {
            // Remove catalog file
            cy.task('writeFile', {
                path: 'src/data/event-catalog.json',
                content: ''
            })

            cy.request({
                method: 'GET',
                url: '/api/catalog',
                failOnStatusCode: false
            }).then((response) => {
                expect(response.status).to.eq(404)
            })
        })

        it('should return catalog when it exists', () => {
            const catalog = {
                'test-event': { description: 'Test event' }
            }

            // Create catalog file
            cy.task('writeFile', {
                path: 'src/data/event-catalog.json',
                content: JSON.stringify(catalog)
            })

            cy.request({
                method: 'GET',
                url: '/api/catalog'
            }).then((response) => {
                expect(response.status).to.eq(200)
                expect(response.body).to.deep.equal(catalog)
            })
        })
    })

    describe('Error handling', () => {
        it('should handle malformed query parameters', () => {
            cy.request({
                method: 'GET',
                url: '/api/events-stats?statsId=',
                failOnStatusCode: false
            }).then((response) => {
                expect(response.status).to.eq(200) // Should handle empty statsId gracefully
            })
        })

        it('should handle invalid HTTP methods', () => {
            cy.request({
                method: 'DELETE',
                url: '/api/events-stats',
                failOnStatusCode: false
            }).then((response) => {
                expect(response.status).to.eq(404)
            })
        })

        it('should handle non-existent endpoints', () => {
            cy.request({
                method: 'GET',
                url: '/api/non-existent',
                failOnStatusCode: false
            }).then((response) => {
                expect(response.status).to.eq(404)
            })
        })
    })

    describe('Performance and load', () => {
        it('should handle many events efficiently', () => {
            // Create 100 events
            for (let i = 0; i < 100; i++) {
                cy.request({
                    method: 'POST',
                    url: '/api/events-stats',
                    body: {
                        eventKey: `perf-event-${i}`,
                        timestamp: new Date().toISOString()
                    },
                    headers: {
                        'Content-Type': 'application/json'
                    }
                })
            }

            // Verify all events are stored
            cy.request({
                method: 'GET',
                url: '/api/events-stats'
            }).then((response) => {
                expect(response.body.totalEvents).to.eq(100)
                expect(Object.keys(response.body.events)).to.have.length(100)
            })
        })

        it('should handle rapid requests', () => {
            // Send 10 rapid requests
            for (let i = 0; i < 10; i++) {
                cy.request({
                    method: 'POST',
                    url: '/api/events-stats',
                    body: {
                        eventKey: 'rapid-event',
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
                expect(response.body.events['rapid-event'].count).to.eq(10)
            })
        })
    })
}) 