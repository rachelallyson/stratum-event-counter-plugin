import { defineConfig } from 'cypress'

// Generate a unique run ID for this Cypress session
function generateCypressRunId(): string {
    return `cypress-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

export default defineConfig({
    e2e: {
        // baseUrl: 'http://localhost:41321', // Commented out to avoid server verification issues
        supportFile: 'cypress/support/e2e.ts',
        specPattern: 'cypress/e2e/**/*.cy.ts',
        setupNodeEvents(on, config) {
            let currentRunId: string | null = null;

            // Set up run ID at the start of the test run
            on('before:run', async () => {
                currentRunId = generateCypressRunId();
                console.log(`🎯 Setting Cypress run ID: ${currentRunId}`);

                try {
                    // Set the active run ID on the dashboard server
                    const response = await fetch('http://localhost:41321/api/active-run-id', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ runId: currentRunId })
                    });

                    if (response.ok) {
                        const data = await response.json();
                        console.log(`✅ Active run ID set on dashboard: ${data.runId}`);
                    } else {
                        console.warn(`⚠️ Failed to set active run ID: ${response.status}`);
                    }
                } catch (error) {
                    console.warn('⚠️ Could not communicate with dashboard server:', error);
                }
            });

            // Clear run ID after the test run
            on('after:run', async () => {
                if (currentRunId) {
                    console.log(`🧹 Clearing Cypress run ID: ${currentRunId}`);

                    try {
                        const response = await fetch('http://localhost:41321/api/active-run-id', {
                            method: 'DELETE'
                        });

                        if (response.ok) {
                            console.log('✅ Active run ID cleared from dashboard');
                        } else {
                            console.warn(`⚠️ Failed to clear active run ID: ${response.status}`);
                        }
                    } catch (error) {
                        console.warn('⚠️ Could not communicate with dashboard server:', error);
                    }

                    currentRunId = null;
                }
            });

            // Tasks for getting/setting run ID during tests
            on('task', {
                getCurrentRunId() {
                    return currentRunId;
                },

                async setActiveRunId(runId: string) {
                    try {
                        const response = await fetch('http://localhost:41321/api/active-run-id', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ runId })
                        });

                        if (response.ok) {
                            const data = await response.json();
                            return data.runId;
                        } else {
                            throw new Error(`Failed to set run ID: ${response.status}`);
                        }
                    } catch (error) {
                        throw error;
                    }
                },

                async writeFile({ path, content }) {
                    const fs = await import('fs')
                    fs.writeFileSync(path, content)
                    return null
                },

                async readFile(path) {
                    const fs = await import('fs')
                    return fs.readFileSync(path, 'utf8')
                }
            })

            return config;
        },
    },
}) 