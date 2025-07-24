import { generateSubtitle } from '../../video-captions.js';
import { logger, loggerTagsFactory } from '../../../helpers/logger.js';
import { VideoModel } from '../../../models/video/video.js';
const lTags = loggerTagsFactory('transcription');
export async function processVideoTranscription(job) {
    const payload = job.data;
    logger.info('Processing video transcription in job %s.', job.id);
    const video = await VideoModel.load(payload.videoUUID);
    if (!video) {
        logger.info('Do not process transcription job %d, video does not exist.', job.id, lTags(payload.videoUUID));
        return;
    }
    return generateSubtitle({ video });
}
//# sourceMappingURL=video-transcription.js.map