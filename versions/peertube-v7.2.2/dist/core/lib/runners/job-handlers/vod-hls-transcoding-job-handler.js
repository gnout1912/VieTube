import { pick } from '@peertube/peertube-core-utils';
import { buildUUID } from '@peertube/peertube-node-utils';
import { logger } from '../../../helpers/logger.js';
import { onTranscodingEnded } from '../../transcoding/ended-transcoding.js';
import { onHLSVideoFileTranscoding } from '../../transcoding/hls-transcoding.js';
import { removeAllWebVideoFiles } from '../../video-file.js';
import { VideoJobInfoModel } from '../../../models/video/video-job-info.js';
import { generateRunnerTranscodingAudioInputFileUrl, generateRunnerTranscodingVideoInputFileUrl } from '../runner-urls.js';
import { AbstractVODTranscodingJobHandler } from './abstract-vod-transcoding-job-handler.js';
import { isVideoMissHLSAudio, loadRunnerVideo } from './shared/utils.js';
export class VODHLSTranscodingJobHandler extends AbstractVODTranscodingJobHandler {
    async create(options) {
        const { video, resolution, fps, dependsOnRunnerJob, separatedAudio, priority } = options;
        const jobUUID = buildUUID();
        const { separatedAudioFile } = video.getMaxQualityAudioAndVideoFiles();
        const payload = {
            input: {
                videoFileUrl: generateRunnerTranscodingVideoInputFileUrl(jobUUID, video.uuid),
                separatedAudioFileUrl: separatedAudioFile
                    ? [generateRunnerTranscodingAudioInputFileUrl(jobUUID, video.uuid)]
                    : []
            },
            output: {
                resolution,
                fps,
                separatedAudio
            }
        };
        const privatePayload = Object.assign(Object.assign({}, pick(options, ['isNewVideo', 'deleteWebVideoFiles'])), { videoUUID: video.uuid });
        const job = await this.createRunnerJob({
            type: 'vod-hls-transcoding',
            jobUUID,
            payload,
            privatePayload,
            priority,
            dependsOnRunnerJob
        });
        await VideoJobInfoModel.increaseOrCreate(video.uuid, 'pendingTranscode');
        return job;
    }
    async specificComplete(options) {
        const { runnerJob, resultPayload } = options;
        const payload = runnerJob.payload;
        const privatePayload = runnerJob.privatePayload;
        const video = await loadRunnerVideo(runnerJob, this.lTags);
        if (!video)
            return;
        const videoFilePath = resultPayload.videoFile;
        const resolutionPlaylistFilePath = resultPayload.resolutionPlaylistFile;
        await onHLSVideoFileTranscoding({
            video,
            m3u8OutputPath: resolutionPlaylistFilePath,
            videoOutputPath: videoFilePath
        });
        const moveVideoToNextState = !await isVideoMissHLSAudio({
            resolution: payload.output.resolution,
            separatedAudio: payload.output.separatedAudio,
            videoId: video.uuid
        });
        await onTranscodingEnded({ isNewVideo: privatePayload.isNewVideo, moveVideoToNextState, video });
        if (privatePayload.deleteWebVideoFiles === true) {
            logger.info('Removing web video files of %s now we have a HLS version of it.', video.uuid, this.lTags(video.uuid));
            await removeAllWebVideoFiles(video);
        }
        logger.info('Runner VOD HLS job %s for %s ended.', runnerJob.uuid, video.uuid, this.lTags(runnerJob.uuid, video.uuid));
    }
}
//# sourceMappingURL=vod-hls-transcoding-job-handler.js.map