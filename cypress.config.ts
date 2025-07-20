import { defineConfig } from 'cypress'

export default defineConfig({
    e2e: {
        // baseUrl: 'http://localhost:41321', // Commented out to avoid server verification issues
        supportFile: 'cypress/support/e2e.ts',
        specPattern: 'cypress/e2e/**/*.cy.ts',
        setupNodeEvents(on, config) {
            let currentRunId: string | null = null;

            // Set up run ID at the start of the test run
            // This ensures ALL tests in this "cypress run" share the same run ID
            on('before:run', async () => {
                try {
                    // Dynamic import to avoid ES module issues
                    const { startTestRun } = await import('./dist/test-utils.js');
                    currentRunId = await startTestRun({ prefix: 'cypress' });
                    console.log(`🎯 Cypress run started with ID: ${currentRunId}`);
                } catch (error) {
                    console.warn('⚠️ Could not load test utilities:', error);
                    // Fallback to manual approach
                    currentRunId = `cypress-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                    console.log(`🎯 Fallback Cypress run ID: ${currentRunId}`);
                }
            });

            // Clear run ID after the test run
            on('after:run', async () => {
                if (currentRunId) {
                    console.log(`🧹 Clearing Cypress run ID: ${currentRunId}`);
                    try {
                        // Dynamic import to avoid ES module issues
                        const { endTestRun } = await import('./dist/test-utils.js');
                        await endTestRun();
                    } catch (error) {
                        console.warn('⚠️ Could not load test utilities for cleanup:', error);
                        // Fallback manual cleanup
                        try {
                            await fetch('http://localhost:41321/api/active-run-id', { method: 'DELETE' });
                        } catch (fetchError) {
                            console.warn('⚠️ Could not clear run ID manually:', fetchError);
                        }
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
                }
            });

            return config;
        }
    }
}); 