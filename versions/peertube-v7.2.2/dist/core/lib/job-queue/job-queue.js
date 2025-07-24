import { pick, timeoutPromise } from '@peertube/peertube-core-utils';
import { jobStates } from '../../helpers/custom-validators/jobs.js';
import { CONFIG } from '../../initializers/config.js';
import { processVideoRedundancy } from './handlers/video-redundancy.js';
import { FlowProducer, Queue, QueueEvents, Worker } from 'bullmq';
import { logger } from '../../helpers/logger.js';
import { JOB_ATTEMPTS, JOB_CONCURRENCY, JOB_REMOVAL_OPTIONS, JOB_TTL, REPEAT_JOBS, WEBSERVER } from '../../initializers/constants.js';
import { Hooks } from '../plugins/hooks.js';
import { Redis } from '../redis.js';
import { processActivityPubCleaner } from './handlers/activitypub-cleaner.js';
import { processActivityPubFollow } from './handlers/activitypub-follow.js';
import { processActivityPubHttpSequentialBroadcast, processActivityPubParallelHttpBroadcast } from './handlers/activitypub-http-broadcast.js';
import { processActivityPubHttpFetcher } from './handlers/activitypub-http-fetcher.js';
import { processActivityPubHttpUnicast } from './handlers/activitypub-http-unicast.js';
import { refreshAPObject } from './handlers/activitypub-refresher.js';
import { processActorKeys } from './handlers/actor-keys.js';
import { processAfterVideoChannelImport } from './handlers/after-video-channel-import.js';
import { processCreateUserExport } from './handlers/create-user-export.js';
import { processEmail } from './handlers/email.js';
import { processFederateVideo } from './handlers/federate-video.js';
import { processGenerateStoryboard } from './handlers/generate-storyboard.js';
import { processImportUserArchive } from './handlers/import-user-archive.js';
import { processManageVideoTorrent } from './handlers/manage-video-torrent.js';
import { onMoveToFileSystemFailure, processMoveToFileSystem } from './handlers/move-to-file-system.js';
import { onMoveToObjectStorageFailure, processMoveToObjectStorage } from './handlers/move-to-object-storage.js';
import { processNotify } from './handlers/notify.js';
import { processTranscodingJobBuilder } from './handlers/transcoding-job-builder.js';
import { processVideoChannelImport } from './handlers/video-channel-import.js';
import { processVideoFileImport } from './handlers/video-file-import.js';
import { processVideoImport } from './handlers/video-import.js';
import { processVideoLiveEnding } from './handlers/video-live-ending.js';
import { processVideoStudioEdition } from './handlers/video-studio-edition.js';
import { processVideoTranscoding } from './handlers/video-transcoding.js';
import { processVideoTranscription } from './handlers/video-transcription.js';
import { processVideosViewsStats } from './handlers/video-views-stats.js';
const handlers = {
    'activitypub-cleaner': processActivityPubCleaner,
    'activitypub-follow': processActivityPubFollow,
    'activitypub-http-broadcast-parallel': processActivityPubParallelHttpBroadcast,
    'activitypub-http-broadcast': processActivityPubHttpSequentialBroadcast,
    'activitypub-http-fetcher': processActivityPubHttpFetcher,
    'activitypub-http-unicast': processActivityPubHttpUnicast,
    'activitypub-refresher': refreshAPObject,
    'actor-keys': processActorKeys,
    'after-video-channel-import': processAfterVideoChannelImport,
    'email': processEmail,
    'federate-video': processFederateVideo,
    'transcoding-job-builder': processTranscodingJobBuilder,
    'manage-video-torrent': processManageVideoTorrent,
    'move-to-object-storage': processMoveToObjectStorage,
    'move-to-file-system': processMoveToFileSystem,
    'notify': processNotify,
    'video-channel-import': processVideoChannelImport,
    'video-file-import': processVideoFileImport,
    'video-import': processVideoImport,
    'video-live-ending': processVideoLiveEnding,
    'video-redundancy': processVideoRedundancy,
    'video-studio-edition': processVideoStudioEdition,
    'video-transcoding': processVideoTranscoding,
    'videos-views-stats': processVideosViewsStats,
    'generate-video-storyboard': processGenerateStoryboard,
    'create-user-export': processCreateUserExport,
    'import-user-archive': processImportUserArchive,
    'video-transcription': processVideoTranscription
};
const errorHandlers = {
    'move-to-object-storage': onMoveToObjectStorageFailure,
    'move-to-file-system': onMoveToFileSystemFailure
};
const jobTypes = [
    'activitypub-cleaner',
    'activitypub-follow',
    'activitypub-http-broadcast-parallel',
    'activitypub-http-broadcast',
    'activitypub-http-fetcher',
    'activitypub-http-unicast',
    'activitypub-refresher',
    'actor-keys',
    'after-video-channel-import',
    'email',
    'federate-video',
    'generate-video-storyboard',
    'manage-video-torrent',
    'move-to-object-storage',
    'move-to-file-system',
    'notify',
    'transcoding-job-builder',
    'video-channel-import',
    'video-file-import',
    'video-import',
    'video-live-ending',
    'video-redundancy',
    'video-studio-edition',
    'video-transcription',
    'videos-views-stats',
    'create-user-export',
    'import-user-archive',
    'video-transcoding'
];
const silentFailure = new Set(['activitypub-http-unicast']);
class JobQueue {
    constructor() {
        this.workers = {};
        this.queues = {};
        this.queueEvents = {};
        this.initialized = false;
    }
    init() {
        if (this.initialized === true)
            return;
        this.initialized = true;
        this.jobRedisPrefix = 'bull-' + WEBSERVER.HOST;
        for (const handlerName of Object.keys(handlers)) {
            this.buildWorker(handlerName);
            this.buildQueue(handlerName);
            this.buildQueueEvent(handlerName);
        }
        this.flowProducer = new FlowProducer({
            connection: Redis.getRedisClientOptions('FlowProducer'),
            prefix: this.jobRedisPrefix
        });
        this.flowProducer.on('error', err => {
            logger.error('Error in flow producer', { err });
        });
        this.addRepeatableJobs();
    }
    buildWorker(handlerName) {
        const workerOptions = {
            autorun: false,
            concurrency: this.getJobConcurrency(handlerName),
            prefix: this.jobRedisPrefix,
            connection: Redis.getRedisClientOptions('Worker'),
            maxStalledCount: 10
        };
        const handler = function (job) {
            const timeout = JOB_TTL[handlerName];
            const p = handlers[handlerName](job);
            if (!timeout)
                return p;
            return timeoutPromise(p, timeout);
        };
        const processor = async (jobArg) => {
            const job = await Hooks.wrapObject(jobArg, 'filter:job-queue.process.params', { type: handlerName });
            return Hooks.wrapPromiseFun(handler, job, 'filter:job-queue.process.result');
        };
        const worker = new Worker(handlerName, processor, workerOptions);
        worker.on('failed', (job, err) => {
            const logLevel = silentFailure.has(handlerName)
                ? 'debug'
                : 'error';
            logger.log(logLevel, 'Cannot execute job %s in queue %s.', job.id, handlerName, { payload: job.data, err });
            if (errorHandlers[handlerName]) {
                errorHandlers[handlerName](job, err)
                    .catch(err => logger.error('Cannot run error handler for job failure %d in queue %s.', job.id, handlerName, { err }));
            }
        });
        worker.on('error', err => {
            logger.error('Error in job worker %s.', handlerName, { err });
        });
        this.workers[handlerName] = worker;
    }
    buildQueue(handlerName) {
        const queueOptions = {
            connection: Redis.getRedisClientOptions('Queue'),
            prefix: this.jobRedisPrefix
        };
        const queue = new Queue(handlerName, queueOptions);
        queue.on('error', err => {
            logger.error('Error in job queue %s.', handlerName, { err });
        });
        this.queues[handlerName] = queue;
        queue.removeDeprecatedPriorityKey()
            .catch(err => logger.error('Cannot remove bullmq deprecated priority keys of ' + handlerName, { err }));
    }
    buildQueueEvent(handlerName) {
        const queueEventsOptions = {
            autorun: false,
            connection: Redis.getRedisClientOptions('QueueEvent'),
            prefix: this.jobRedisPrefix
        };
        const queueEvents = new QueueEvents(handlerName, queueEventsOptions);
        queueEvents.on('error', err => {
            logger.error('Error in job queue events %s.', handlerName, { err });
        });
        this.queueEvents[handlerName] = queueEvents;
    }
    async terminate() {
        const promises = Object.keys(this.workers)
            .map(handlerName => {
            const worker = this.workers[handlerName];
            const queue = this.queues[handlerName];
            const queueEvent = this.queueEvents[handlerName];
            return Promise.all([
                worker.close(false),
                queue.close(),
                queueEvent.close()
            ]);
        });
        return Promise.all(promises);
    }
    start() {
        const promises = Object.keys(this.workers)
            .map(handlerName => {
            const worker = this.workers[handlerName];
            const queueEvent = this.queueEvents[handlerName];
            return Promise.all([
                worker.run(),
                queueEvent.run()
            ]);
        });
        return Promise.all(promises);
    }
    async pause() {
        for (const handlerName of Object.keys(this.workers)) {
            const worker = this.workers[handlerName];
            await worker.pause();
        }
    }
    resume() {
        for (const handlerName of Object.keys(this.workers)) {
            const worker = this.workers[handlerName];
            worker.resume();
        }
    }
    createJobAsync(options) {
        this.createJob(options)
            .catch(err => logger.error('Cannot create job.', { err, options }));
    }
    createJob(options) {
        if (!options)
            return;
        const queue = this.queues[options.type];
        if (queue === undefined) {
            logger.error('Unknown queue %s: cannot create job.', options.type);
            return;
        }
        const jobOptions = this.buildJobOptions(options.type, pick(options, ['priority', 'delay']));
        return queue.add('job', options.payload, jobOptions);
    }
    createSequentialJobFlow(...jobs) {
        let lastJob;
        logger.debug('Creating jobs in local job queue', { jobs });
        for (const job of jobs) {
            if (!job)
                continue;
            lastJob = Object.assign(Object.assign({}, this.buildJobFlowOption(job)), { children: lastJob
                    ? [lastJob]
                    : [] });
        }
        return this.flowProducer.add(lastJob);
    }
    createJobWithChildren(parent, children) {
        return this.flowProducer.add(Object.assign(Object.assign({}, this.buildJobFlowOption(parent)), { children: children.map(c => this.buildJobFlowOption(c)) }));
    }
    buildJobFlowOption(job) {
        return {
            name: 'job',
            data: job.payload,
            queueName: job.type,
            opts: Object.assign({ failParentOnFailure: true }, this.buildJobOptions(job.type, pick(job, ['priority', 'delay', 'failParentOnFailure'])))
        };
    }
    buildJobOptions(type, options = {}) {
        return Object.assign({ backoff: { delay: 60 * 1000, type: 'exponential' }, attempts: JOB_ATTEMPTS[type], priority: options.priority, delay: options.delay }, this.buildJobRemovalOptions(type));
    }
    async listForApi(options) {
        const { state, start, count, asc, jobType } = options;
        const states = this.buildStateFilter(state);
        const filteredJobTypes = this.buildTypeFilter(jobType);
        let results = [];
        for (const jobType of filteredJobTypes) {
            const queue = this.queues[jobType];
            if (queue === undefined) {
                logger.error('Unknown queue %s to list jobs.', jobType);
                continue;
            }
            let jobs = await queue.getJobs(states, 0, start + count, asc);
            jobs = jobs.filter(j => !!j);
            results = results.concat(jobs);
        }
        results.sort((j1, j2) => {
            if (j1.timestamp < j2.timestamp)
                return -1;
            else if (j1.timestamp === j2.timestamp)
                return 0;
            return 1;
        });
        if (asc === false)
            results.reverse();
        return results.slice(start, start + count);
    }
    async count(state, jobType) {
        const states = this.buildStateFilter(state);
        const filteredJobTypes = this.buildTypeFilter(jobType);
        let total = 0;
        for (const type of filteredJobTypes) {
            const queue = this.queues[type];
            if (queue === undefined) {
                logger.error('Unknown queue %s to count jobs.', type);
                continue;
            }
            const counts = await queue.getJobCounts();
            for (const s of states) {
                total += counts[s];
            }
        }
        return total;
    }
    buildStateFilter(state) {
        if (!state)
            return Array.from(jobStates);
        const states = [state];
        if (state === 'waiting') {
            states.push('waiting-children');
            states.push('prioritized');
        }
        return states;
    }
    buildTypeFilter(jobType) {
        if (!jobType)
            return jobTypes;
        return jobTypes.filter(t => t === jobType);
    }
    async getStats() {
        const promises = jobTypes.map(async (t) => ({ jobType: t, counts: await this.queues[t].getJobCounts() }));
        return Promise.all(promises);
    }
    addRepeatableJobs() {
        this.queues['videos-views-stats'].add('job', {}, Object.assign({ repeat: REPEAT_JOBS['videos-views-stats'] }, this.buildJobRemovalOptions('videos-views-stats'))).catch(err => logger.error('Cannot add repeatable job.', { err }));
        if (CONFIG.FEDERATION.VIDEOS.CLEANUP_REMOTE_INTERACTIONS) {
            this.queues['activitypub-cleaner'].add('job', {}, Object.assign({ repeat: REPEAT_JOBS['activitypub-cleaner'] }, this.buildJobRemovalOptions('activitypub-cleaner'))).catch(err => logger.error('Cannot add repeatable job.', { err }));
        }
    }
    getJobConcurrency(jobType) {
        if (jobType === 'video-transcoding')
            return CONFIG.TRANSCODING.CONCURRENCY;
        if (jobType === 'video-import')
            return CONFIG.IMPORT.VIDEOS.CONCURRENCY;
        return JOB_CONCURRENCY[jobType];
    }
    buildJobRemovalOptions(queueName) {
        return {
            removeOnComplete: {
                age: (JOB_REMOVAL_OPTIONS.SUCCESS[queueName] || JOB_REMOVAL_OPTIONS.SUCCESS.DEFAULT) / 1000,
                count: JOB_REMOVAL_OPTIONS.COUNT
            },
            removeOnFail: {
                age: (JOB_REMOVAL_OPTIONS.FAILURE[queueName] || JOB_REMOVAL_OPTIONS.FAILURE.DEFAULT) / 1000,
                count: JOB_REMOVAL_OPTIONS.COUNT / 1000
            }
        };
    }
    static get Instance() {
        return this.instance || (this.instance = new this());
    }
}
export { JobQueue, jobTypes };
//# sourceMappingURL=job-queue.js.map