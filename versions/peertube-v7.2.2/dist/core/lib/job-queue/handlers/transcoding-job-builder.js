import { pick } from '@peertube/peertube-core-utils';
import { VideoFileStream } from '@peertube/peertube-models';
import { createOptimizeOrMergeAudioJobs } from '../../transcoding/create-transcoding-job.js';
import { UserModel } from '../../../models/user/user.js';
import { VideoJobInfoModel } from '../../../models/video/video-job-info.js';
import { VideoModel } from '../../../models/video/video.js';
import { logger } from '../../../helpers/logger.js';
import { JobQueue } from '../job-queue.js';
async function processTranscodingJobBuilder(job) {
    const payload = job.data;
    logger.info('Processing transcoding job builder in job %s.', job.id);
    if (payload.optimizeJob) {
        const video = await VideoModel.loadFull(payload.videoUUID);
        const user = await UserModel.loadByVideoId(video.id);
        const videoFile = video.getMaxQualityFile(VideoFileStream.VIDEO) || video.getMaxQualityFile(VideoFileStream.AUDIO);
        await createOptimizeOrMergeAudioJobs(Object.assign(Object.assign({}, pick(payload.optimizeJob, ['isNewVideo'])), { video,
            videoFile,
            user, videoFileAlreadyLocked: false }));
    }
    for (const job of (payload.jobs || [])) {
        await JobQueue.Instance.createJob(job);
        await VideoJobInfoModel.increaseOrCreate(payload.videoUUID, 'pendingTranscode');
    }
    for (const sequentialJobs of (payload.sequentialJobs || [])) {
        await JobQueue.Instance.createSequentialJobFlow(...sequentialJobs);
        await VideoJobInfoModel.increaseOrCreate(payload.videoUUID, 'pendingTranscode', sequentialJobs.filter(s => !!s).length);
    }
}
export { processTranscodingJobBuilder };
//# sourceMappingURL=transcoding-job-builder.js.map