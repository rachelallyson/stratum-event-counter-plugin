import { defineConfig } from 'cypress'

export default defineConfig({
    e2e: {
        baseUrl: 'http://localhost:41321',
        supportFile: 'cypress/support/e2e.ts',
        specPattern: 'cypress/e2e/**/*.cy.ts',
        setupNodeEvents(on, config) {
            // implement node event listeners here
            on('task', {
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
        },
    },
}) 