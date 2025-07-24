import { LocalVideoViewerModel } from '../../models/view/local-video-viewer.js';
import { LocalVideoViewerWatchSectionModel } from '../../models/view/local-video-viewer-watch-section.js';
import { getDurationFromActivityStream } from './activity.js';
async function createOrUpdateLocalVideoViewer(watchAction, video, t) {
    var _a, _b;
    const stats = await LocalVideoViewerModel.loadByUrl(watchAction.id);
    if (stats)
        await stats.destroy({ transaction: t });
    const localVideoViewer = await LocalVideoViewerModel.create({
        url: watchAction.id,
        uuid: watchAction.uuid,
        watchTime: getDurationFromActivityStream(watchAction.duration),
        startDate: new Date(watchAction.startTime),
        endDate: new Date(watchAction.endTime),
        country: ((_a = watchAction.location) === null || _a === void 0 ? void 0 : _a.addressCountry) || null,
        subdivisionName: ((_b = watchAction.location) === null || _b === void 0 ? void 0 : _b.addressRegion) || null,
        videoId: video.id
    }, { transaction: t });
    await LocalVideoViewerWatchSectionModel.bulkCreateSections({
        localVideoViewerId: localVideoViewer.id,
        watchSections: watchAction.watchSections.map(s => ({
            start: s.startTimestamp,
            end: s.endTimestamp
        })),
        transaction: t
    });
}
export { createOrUpdateLocalVideoViewer };
//# sourceMappingURL=local-video-viewer.js.map