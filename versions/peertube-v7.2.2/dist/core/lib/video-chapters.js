import { parseChapters, sortBy } from '@peertube/peertube-core-utils';
import { logger, loggerTagsFactory } from '../helpers/logger.js';
import { VideoChapterModel } from '../models/video/video-chapter.js';
import { InternalEventEmitter } from './internal-event-emitter.js';
import { CONSTRAINTS_FIELDS } from '../initializers/constants.js';
const lTags = loggerTagsFactory('video', 'chapters');
export async function replaceChapters(options) {
    const { chapters, transaction, video } = options;
    await VideoChapterModel.deleteChapters(video.id, transaction);
    await createChapters({ videoId: video.id, chapters, transaction });
    InternalEventEmitter.Instance.emit('chapters-updated', { video });
}
export async function replaceChaptersIfNotExist(options) {
    const { chapters, transaction, video } = options;
    if (await VideoChapterModel.hasVideoChapters(video.id, transaction))
        return;
    await createChapters({ videoId: video.id, chapters, transaction });
    InternalEventEmitter.Instance.emit('chapters-updated', { video });
}
export async function replaceChaptersFromDescriptionIfNeeded(options) {
    const { transaction, video, newDescription, oldDescription = '' } = options;
    const chaptersFromOldDescription = sortBy(parseChapters(oldDescription, CONSTRAINTS_FIELDS.VIDEO_CHAPTERS.TITLE.max), 'timecode');
    const existingChapters = await VideoChapterModel.listChaptersOfVideo(video.id, transaction);
    logger.debug('Check if we replace chapters from description', Object.assign({ oldDescription, chaptersFromOldDescription, newDescription, existingChapters }, lTags(video.uuid)));
    if (areSameChapters(chaptersFromOldDescription, existingChapters)) {
        const chaptersFromNewDescription = sortBy(parseChapters(newDescription, CONSTRAINTS_FIELDS.VIDEO_CHAPTERS.TITLE.max), 'timecode');
        if (chaptersFromOldDescription.length === 0 && chaptersFromNewDescription.length === 0)
            return false;
        await replaceChapters({ video, chapters: chaptersFromNewDescription, transaction });
        logger.info('Replaced chapters of video ' + video.uuid, Object.assign({ chaptersFromNewDescription }, lTags(video.uuid)));
        return true;
    }
    return false;
}
async function createChapters(options) {
    const { chapters, transaction, videoId } = options;
    const existingTimecodes = new Set();
    for (const chapter of chapters) {
        if (existingTimecodes.has(chapter.timecode))
            continue;
        await VideoChapterModel.create({
            title: chapter.title,
            timecode: chapter.timecode,
            videoId
        }, { transaction });
        existingTimecodes.add(chapter.timecode);
    }
}
function areSameChapters(chapters1, chapters2) {
    if (chapters1.length !== chapters2.length)
        return false;
    for (let i = 0; i < chapters1.length; i++) {
        if (chapters1[i].timecode !== chapters2[i].timecode)
            return false;
        if (chapters1[i].title !== chapters2[i].title)
            return false;
    }
    return true;
}
//# sourceMappingURL=video-chapters.js.map