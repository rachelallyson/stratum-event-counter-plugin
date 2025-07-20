export { EventCounterPluginFactory, type EventCounterPluginOptions } from './event-counter-plugin';
export { EventCounterPublisher } from './event-counter-publisher';

// Export test utilities for easy access
export {
    generateRunId,
    setActiveRunId,
    clearActiveRunId,
    getActiveRunId,
    resetRunStats,
    startTestRun,
    endTestRun
} from './test-utils';
