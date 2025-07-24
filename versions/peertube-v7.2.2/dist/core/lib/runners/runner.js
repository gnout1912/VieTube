import { RunnerJobState } from '@peertube/peertube-models';
import { runInReadCommittedTransaction } from '../../helpers/database-utils.js';
import { logger, loggerTagsFactory } from '../../helpers/logger.js';
import { RUNNER_JOBS } from '../../initializers/constants.js';
const lTags = loggerTagsFactory('runner');
const updatingRunner = new Set();
export function updateLastRunnerContact(req, runner) {
    const now = new Date();
    if (now.getTime() - runner.lastContact.getTime() < RUNNER_JOBS.LAST_CONTACT_UPDATE_INTERVAL)
        return;
    if (updatingRunner.has(runner.id))
        return;
    updatingRunner.add(runner.id);
    runner.lastContact = now;
    runner.ip = req.ip;
    logger.debug('Updating last runner contact for %s', runner.name, lTags(runner.name));
    runInReadCommittedTransaction(async (transaction) => {
        return runner.save({ transaction });
    }).catch(err => logger.error('Cannot update last runner contact for %s', runner.name, Object.assign({ err }, lTags(runner.name))))
        .finally(() => updatingRunner.delete(runner.id));
}
export function runnerJobCanBeCancelled(runnerJob) {
    const allowedStates = new Set([
        RunnerJobState.PENDING,
        RunnerJobState.PROCESSING,
        RunnerJobState.WAITING_FOR_PARENT_JOB
    ]);
    return allowedStates.has(runnerJob.state);
}
//# sourceMappingURL=runner.js.map