import { LiveVideoError } from '@peertube/peertube-models';
import { buildUUID } from '@peertube/peertube-node-utils';
import { tryAtomicMove } from '../../../helpers/fs.js';
import { logger } from '../../../helpers/logger.js';
import { JOB_PRIORITY } from '../../../initializers/constants.js';
import { LiveManager } from '../../live/index.js';
import { remove } from 'fs-extra/esm';
import { join } from 'path';
import { AbstractJobHandler } from './abstract-job-handler.js';
export class LiveRTMPHLSTranscodingJobHandler extends AbstractJobHandler {
    async create(options) {
        const { video, rtmpUrl, toTranscode, playlist, segmentDuration, segmentListSize, outputDirectory, sessionId } = options;
        const jobUUID = buildUUID();
        const payload = {
            input: {
                rtmpUrl
            },
            output: {
                toTranscode,
                segmentListSize,
                segmentDuration
            }
        };
        const privatePayload = {
            videoUUID: video.uuid,
            masterPlaylistName: playlist.playlistFilename,
            sessionId,
            outputDirectory
        };
        const job = await this.createRunnerJob({
            type: 'live-rtmp-hls-transcoding',
            jobUUID,
            payload,
            privatePayload,
            priority: JOB_PRIORITY.TRANSCODING
        });
        return job;
    }
    async specificUpdate(options) {
        const { runnerJob, updatePayload } = options;
        const privatePayload = runnerJob.privatePayload;
        const outputDirectory = privatePayload.outputDirectory;
        const videoUUID = privatePayload.videoUUID;
        if (updatePayload.type === 'add-chunk') {
            await tryAtomicMove(updatePayload.videoChunkFile, join(outputDirectory, updatePayload.videoChunkFilename));
        }
        else if (updatePayload.type === 'remove-chunk') {
            await remove(join(outputDirectory, updatePayload.videoChunkFilename));
        }
        if (updatePayload.resolutionPlaylistFile && updatePayload.resolutionPlaylistFilename) {
            await tryAtomicMove(updatePayload.resolutionPlaylistFile, join(outputDirectory, updatePayload.resolutionPlaylistFilename));
        }
        if (updatePayload.masterPlaylistFile) {
            await tryAtomicMove(updatePayload.masterPlaylistFile, join(outputDirectory, privatePayload.masterPlaylistName));
        }
        logger.debug('Runner live RTMP to HLS job %s for %s updated.', runnerJob.uuid, videoUUID, Object.assign({ updatePayload }, this.lTags(videoUUID, runnerJob.uuid)));
    }
    specificComplete(options) {
        return this.stopLive({
            runnerJob: options.runnerJob,
            type: 'ended'
        });
    }
    isAbortSupported() {
        return false;
    }
    specificAbort() {
        throw new Error('Not implemented');
    }
    specificError(options) {
        return this.stopLive({
            runnerJob: options.runnerJob,
            type: 'errored'
        });
    }
    specificCancel(options) {
        return this.stopLive({
            runnerJob: options.runnerJob,
            type: 'cancelled'
        });
    }
    stopLive(options) {
        const { runnerJob, type } = options;
        const privatePayload = runnerJob.privatePayload;
        const videoUUID = privatePayload.videoUUID;
        const errorType = {
            ended: null,
            errored: LiveVideoError.RUNNER_JOB_ERROR,
            cancelled: LiveVideoError.RUNNER_JOB_CANCEL
        };
        LiveManager.Instance.stopSessionOfVideo({
            videoUUID: privatePayload.videoUUID,
            expectedSessionId: privatePayload.sessionId,
            error: errorType[type]
        });
        logger.info('Runner live RTMP to HLS job %s for video %s %s.', runnerJob.uuid, videoUUID, type, this.lTags(runnerJob.uuid, videoUUID));
    }
}
//# sourceMappingURL=live-rtmp-hls-transcoding-job-handler.js.map