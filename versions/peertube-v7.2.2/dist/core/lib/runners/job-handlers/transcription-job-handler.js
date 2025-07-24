import { RunnerJobState } from '@peertube/peertube-models';
import { buildUUID } from '@peertube/peertube-node-utils';
import { JOB_PRIORITY } from '../../../initializers/constants.js';
import { onTranscriptionEnded } from '../../video-captions.js';
import { VideoJobInfoModel } from '../../../models/video/video-job-info.js';
import { generateRunnerTranscodingAudioInputFileUrl } from '../runner-urls.js';
import { AbstractJobHandler } from './abstract-job-handler.js';
import { loadRunnerVideo } from './shared/utils.js';
export class TranscriptionJobHandler extends AbstractJobHandler {
    isAbortSupported() {
        return true;
    }
    specificUpdate(_options) {
    }
    specificAbort(_options) {
    }
    async specificError(options) {
        if (options.nextState !== RunnerJobState.ERRORED)
            return;
        await VideoJobInfoModel.decrease(options.runnerJob.privatePayload.videoUUID, 'pendingTranscription');
    }
    async specificCancel(options) {
        await VideoJobInfoModel.decrease(options.runnerJob.privatePayload.videoUUID, 'pendingTranscription');
    }
    async create(options) {
        const { video } = options;
        const jobUUID = buildUUID();
        const payload = {
            input: {
                videoFileUrl: generateRunnerTranscodingAudioInputFileUrl(jobUUID, video.uuid)
            },
            output: {}
        };
        const privatePayload = {
            videoUUID: video.uuid
        };
        const job = await this.createRunnerJob({
            type: 'video-transcription',
            jobUUID,
            payload,
            privatePayload,
            priority: JOB_PRIORITY.TRANSCODING
        });
        return job;
    }
    async specificComplete(options) {
        const { runnerJob, resultPayload } = options;
        const video = await loadRunnerVideo(runnerJob, this.lTags);
        if (!video)
            return;
        await VideoJobInfoModel.decrease(options.runnerJob.privatePayload.videoUUID, 'pendingTranscription');
        await onTranscriptionEnded({
            video,
            language: resultPayload.inputLanguage,
            vttPath: resultPayload.vttFile,
            lTags: this.lTags().tags
        });
    }
}
//# sourceMappingURL=transcription-job-handler.js.map