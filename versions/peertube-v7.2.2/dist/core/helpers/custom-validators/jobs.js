import { jobTypes } from '../../lib/job-queue/job-queue.js';
import { exists } from './misc.js';
const jobStates = new Set(['active', 'completed', 'failed', 'waiting', 'delayed', 'paused', 'waiting-children', 'prioritized']);
function isValidJobState(value) {
    return exists(value) && jobStates.has(value);
}
function isValidJobType(value) {
    return exists(value) && jobTypes.includes(value);
}
export { jobStates, isValidJobState, isValidJobType };
//# sourceMappingURL=jobs.js.map