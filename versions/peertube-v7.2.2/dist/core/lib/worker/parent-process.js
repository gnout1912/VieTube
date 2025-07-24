import { join } from 'path';
import { Piscina } from 'piscina';
import { JOB_CONCURRENCY, WORKER_THREADS } from '../../initializers/constants.js';
import { logger } from '../../helpers/logger.js';
let downloadImageWorker;
export function downloadImageFromWorker(options) {
    if (!downloadImageWorker) {
        downloadImageWorker = new Piscina({
            filename: new URL(join('workers', 'image-downloader.js'), import.meta.url).href,
            concurrentTasksPerWorker: WORKER_THREADS.DOWNLOAD_IMAGE.CONCURRENCY,
            maxThreads: WORKER_THREADS.DOWNLOAD_IMAGE.MAX_THREADS,
            minThreads: 1,
            idleTimeout: WORKER_THREADS.IDLE_TIMEOUT
        });
        downloadImageWorker.on('error', err => logger.error('Error in download image worker', { err }));
    }
    return downloadImageWorker.run(options);
}
let processImageWorker;
export function processImageFromWorker(options) {
    if (!processImageWorker) {
        processImageWorker = new Piscina({
            filename: new URL(join('workers', 'image-processor.js'), import.meta.url).href,
            concurrentTasksPerWorker: WORKER_THREADS.PROCESS_IMAGE.CONCURRENCY,
            maxThreads: WORKER_THREADS.PROCESS_IMAGE.MAX_THREADS,
            minThreads: 1,
            idleTimeout: WORKER_THREADS.IDLE_TIMEOUT
        });
        processImageWorker.on('error', err => logger.error('Error in process image worker', { err }));
    }
    return processImageWorker.run(options);
}
let getImageSizeWorker;
export function getImageSizeFromWorker(options) {
    if (!getImageSizeWorker) {
        getImageSizeWorker = new Piscina({
            filename: new URL(join('workers', 'get-image-size.js'), import.meta.url).href,
            concurrentTasksPerWorker: WORKER_THREADS.GET_IMAGE_SIZE.CONCURRENCY,
            maxThreads: WORKER_THREADS.GET_IMAGE_SIZE.MAX_THREADS,
            minThreads: 1,
            idleTimeout: WORKER_THREADS.IDLE_TIMEOUT
        });
        getImageSizeWorker.on('error', err => logger.error('Error in get image size worker', { err }));
    }
    return getImageSizeWorker.run(options);
}
let parallelHTTPBroadcastWorker;
export function parallelHTTPBroadcastFromWorker(options) {
    if (!parallelHTTPBroadcastWorker) {
        parallelHTTPBroadcastWorker = new Piscina({
            filename: new URL(join('workers', 'http-broadcast.js'), import.meta.url).href,
            concurrentTasksPerWorker: JOB_CONCURRENCY['activitypub-http-broadcast-parallel'],
            maxThreads: 1,
            minThreads: 1,
            idleTimeout: WORKER_THREADS.IDLE_TIMEOUT
        });
        parallelHTTPBroadcastWorker.on('error', err => logger.error('Error in parallel HTTP broadcast worker', { err }));
    }
    return parallelHTTPBroadcastWorker.run(options);
}
let sequentialHTTPBroadcastWorker;
export function sequentialHTTPBroadcastFromWorker(options) {
    if (!sequentialHTTPBroadcastWorker) {
        sequentialHTTPBroadcastWorker = new Piscina({
            filename: new URL(join('workers', 'http-broadcast.js'), import.meta.url).href,
            concurrentTasksPerWorker: JOB_CONCURRENCY['activitypub-http-broadcast'],
            maxThreads: 1,
            minThreads: 1,
            idleTimeout: WORKER_THREADS.IDLE_TIMEOUT
        });
        sequentialHTTPBroadcastWorker.on('error', err => logger.error('Error in sequential HTTP broadcast image worker', { err }));
    }
    return sequentialHTTPBroadcastWorker.run(options);
}
let httpUnicastWorker;
export function httpUnicastFromWorker(options) {
    if (!httpUnicastWorker) {
        httpUnicastWorker = new Piscina({
            filename: new URL(join('workers', 'http-unicast.js'), import.meta.url).href,
            concurrentTasksPerWorker: JOB_CONCURRENCY['activitypub-http-unicast'],
            maxThreads: 1,
            minThreads: 1,
            idleTimeout: WORKER_THREADS.IDLE_TIMEOUT
        });
        httpUnicastWorker.on('error', err => logger.error('Error in HTTP unicast worker', { err }));
    }
    return httpUnicastWorker.run(options);
}
let signJsonLDObjectWorker;
export function signJsonLDObjectFromWorker(options) {
    if (!signJsonLDObjectWorker) {
        signJsonLDObjectWorker = new Piscina({
            filename: new URL(join('workers', 'sign-json-ld-object.js'), import.meta.url).href,
            concurrentTasksPerWorker: WORKER_THREADS.SIGN_JSON_LD_OBJECT.CONCURRENCY,
            maxThreads: WORKER_THREADS.SIGN_JSON_LD_OBJECT.MAX_THREADS,
            minThreads: 1,
            idleTimeout: WORKER_THREADS.IDLE_TIMEOUT
        });
        signJsonLDObjectWorker.on('error', err => logger.error('Error in sign JSONLD object worker', { err }));
    }
    return signJsonLDObjectWorker.run(options);
}
let buildDigestWorker;
export function buildDigestFromWorker(options) {
    if (!buildDigestWorker) {
        buildDigestWorker = new Piscina({
            filename: new URL(join('workers', 'build-digest.js'), import.meta.url).href,
            concurrentTasksPerWorker: WORKER_THREADS.BUILD_DIGEST.CONCURRENCY,
            maxThreads: WORKER_THREADS.BUILD_DIGEST.MAX_THREADS,
            minThreads: 1,
            idleTimeout: WORKER_THREADS.IDLE_TIMEOUT
        });
        buildDigestWorker.on('error', err => logger.error('Error in build digest worker', { err }));
    }
    return buildDigestWorker.run(options);
}
export function getWorkersStats() {
    return [
        {
            label: 'downloadImage',
            queueSize: (downloadImageWorker === null || downloadImageWorker === void 0 ? void 0 : downloadImageWorker.queueSize) || 0,
            completed: (downloadImageWorker === null || downloadImageWorker === void 0 ? void 0 : downloadImageWorker.completed) || 0
        },
        {
            label: 'processImageWorker',
            queueSize: (processImageWorker === null || processImageWorker === void 0 ? void 0 : processImageWorker.queueSize) || 0,
            completed: (processImageWorker === null || processImageWorker === void 0 ? void 0 : processImageWorker.completed) || 0
        },
        {
            label: 'getImageSizeWorker',
            queueSize: (getImageSizeWorker === null || getImageSizeWorker === void 0 ? void 0 : getImageSizeWorker.queueSize) || 0,
            completed: (getImageSizeWorker === null || getImageSizeWorker === void 0 ? void 0 : getImageSizeWorker.completed) || 0
        },
        {
            label: 'parallelHTTPBroadcastWorker',
            queueSize: (parallelHTTPBroadcastWorker === null || parallelHTTPBroadcastWorker === void 0 ? void 0 : parallelHTTPBroadcastWorker.queueSize) || 0,
            completed: (parallelHTTPBroadcastWorker === null || parallelHTTPBroadcastWorker === void 0 ? void 0 : parallelHTTPBroadcastWorker.completed) || 0
        },
        {
            label: 'sequentialHTTPBroadcastWorker',
            queueSize: (sequentialHTTPBroadcastWorker === null || sequentialHTTPBroadcastWorker === void 0 ? void 0 : sequentialHTTPBroadcastWorker.queueSize) || 0,
            completed: (sequentialHTTPBroadcastWorker === null || sequentialHTTPBroadcastWorker === void 0 ? void 0 : sequentialHTTPBroadcastWorker.completed) || 0
        },
        {
            label: 'httpUnicastWorker',
            queueSize: (httpUnicastWorker === null || httpUnicastWorker === void 0 ? void 0 : httpUnicastWorker.queueSize) || 0,
            completed: (httpUnicastWorker === null || httpUnicastWorker === void 0 ? void 0 : httpUnicastWorker.completed) || 0
        },
        {
            label: 'signJsonLDObjectWorker',
            queueSize: (signJsonLDObjectWorker === null || signJsonLDObjectWorker === void 0 ? void 0 : signJsonLDObjectWorker.queueSize) || 0,
            completed: (signJsonLDObjectWorker === null || signJsonLDObjectWorker === void 0 ? void 0 : signJsonLDObjectWorker.completed) || 0
        },
        {
            label: 'buildDigestWorker',
            queueSize: (buildDigestWorker === null || buildDigestWorker === void 0 ? void 0 : buildDigestWorker.queueSize) || 0,
            completed: (buildDigestWorker === null || buildDigestWorker === void 0 ? void 0 : buildDigestWorker.completed) || 0
        }
    ];
}
//# sourceMappingURL=parent-process.js.map