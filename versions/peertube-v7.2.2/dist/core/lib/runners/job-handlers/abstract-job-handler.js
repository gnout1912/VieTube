import { pick } from '@peertube/peertube-core-utils';
import { RunnerJobState } from '@peertube/peertube-models';
import { saveInTransactionWithRetries } from '../../../helpers/database-utils.js';
import { logger, loggerTagsFactory } from '../../../helpers/logger.js';
import { RUNNER_JOBS } from '../../../initializers/constants.js';
import { sequelizeTypescript } from '../../../initializers/database.js';
import { PeerTubeSocket } from '../../peertube-socket.js';
import { RunnerJobModel } from '../../../models/runner/runner-job.js';
import { setAsUpdated } from '../../../models/shared/update.js';
export class AbstractJobHandler {
    constructor() {
        this.lTags = loggerTagsFactory('runner');
    }
    async createRunnerJob(options) {
        const { priority, dependsOnRunnerJob } = options;
        logger.debug('Creating runner job', Object.assign({ options, dependsOnRunnerJob }, this.lTags(options.type)));
        const runnerJob = new RunnerJobModel(Object.assign(Object.assign({}, pick(options, ['type', 'payload', 'privatePayload'])), { uuid: options.jobUUID, state: dependsOnRunnerJob
                ? RunnerJobState.WAITING_FOR_PARENT_JOB
                : RunnerJobState.PENDING, dependsOnRunnerJobId: dependsOnRunnerJob === null || dependsOnRunnerJob === void 0 ? void 0 : dependsOnRunnerJob.id, priority }));
        await saveInTransactionWithRetries(runnerJob);
        if (runnerJob.state === RunnerJobState.PENDING) {
            PeerTubeSocket.Instance.sendAvailableJobsPingToRunners();
        }
        return runnerJob;
    }
    async update(options) {
        const { runnerJob, progress } = options;
        await this.specificUpdate(options);
        if (progress)
            runnerJob.progress = progress;
        if (!runnerJob.changed()) {
            if (runnerJob.updatedAt.getTime() > Date.now() - 2000)
                return;
            try {
                await setAsUpdated({ sequelize: sequelizeTypescript, table: 'runnerJob', id: runnerJob.id });
            }
            catch (err) {
                logger.warn('Cannot set remote job as updated', Object.assign({ err }, this.lTags(runnerJob.id, runnerJob.type)));
            }
            return;
        }
        await saveInTransactionWithRetries(runnerJob);
    }
    async complete(options) {
        const { runnerJob } = options;
        runnerJob.state = RunnerJobState.COMPLETING;
        await saveInTransactionWithRetries(runnerJob);
        try {
            await this.specificComplete(options);
            runnerJob.state = RunnerJobState.COMPLETED;
        }
        catch (err) {
            logger.error('Cannot complete runner job', Object.assign({ err }, this.lTags(runnerJob.id, runnerJob.type)));
            runnerJob.state = RunnerJobState.ERRORED;
            runnerJob.error = err.message;
        }
        runnerJob.progress = null;
        runnerJob.finishedAt = new Date();
        await saveInTransactionWithRetries(runnerJob);
        const [affectedCount] = await RunnerJobModel.updateDependantJobsOf(runnerJob);
        if (affectedCount !== 0)
            PeerTubeSocket.Instance.sendAvailableJobsPingToRunners();
    }
    async cancel(options) {
        const { runnerJob, fromParent } = options;
        await this.specificCancel(options);
        const cancelState = fromParent
            ? RunnerJobState.PARENT_CANCELLED
            : RunnerJobState.CANCELLED;
        runnerJob.setToErrorOrCancel(cancelState);
        await saveInTransactionWithRetries(runnerJob);
        const children = await RunnerJobModel.listChildrenOf(runnerJob);
        for (const child of children) {
            logger.info(`Cancelling child job ${child.uuid} of ${runnerJob.uuid} because of parent cancel`, this.lTags(child.uuid));
            await this.cancel({ runnerJob: child, fromParent: true });
        }
    }
    async abort(options) {
        const { runnerJob, abortNotSupportedErrorMessage = 'Job has been aborted but it is not supported by this job type' } = options;
        if (this.isAbortSupported() !== true) {
            return this.error({ runnerJob, message: abortNotSupportedErrorMessage });
        }
        await this.specificAbort(options);
        runnerJob.resetToPending();
        await saveInTransactionWithRetries(runnerJob);
        PeerTubeSocket.Instance.sendAvailableJobsPingToRunners();
    }
    setAbortState(runnerJob) {
        runnerJob.resetToPending();
    }
    async error(options) {
        const { runnerJob, message, fromParent } = options;
        const errorState = fromParent
            ? RunnerJobState.PARENT_ERRORED
            : RunnerJobState.ERRORED;
        const nextState = errorState === RunnerJobState.ERRORED && this.isAbortSupported() && runnerJob.failures < RUNNER_JOBS.MAX_FAILURES
            ? RunnerJobState.PENDING
            : errorState;
        await this.specificError(Object.assign(Object.assign({}, options), { nextState }));
        if (nextState === errorState) {
            runnerJob.setToErrorOrCancel(nextState);
            runnerJob.error = message;
        }
        else {
            runnerJob.resetToPending();
        }
        await saveInTransactionWithRetries(runnerJob);
        if (runnerJob.state === errorState) {
            const children = await RunnerJobModel.listChildrenOf(runnerJob);
            for (const child of children) {
                logger.info(`Erroring child job ${child.uuid} of ${runnerJob.uuid} because of parent error`, this.lTags(child.uuid));
                await this.error({ runnerJob: child, message: 'Parent error', fromParent: true });
            }
        }
        else {
            PeerTubeSocket.Instance.sendAvailableJobsPingToRunners();
        }
    }
}
//# sourceMappingURL=abstract-job-handler.js.map