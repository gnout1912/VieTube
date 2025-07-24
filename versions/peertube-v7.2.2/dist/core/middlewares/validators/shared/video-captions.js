import { VideoCaptionModel } from '../../../models/video/video-caption.js';
import { HttpStatusCode } from '@peertube/peertube-models';
async function doesVideoCaptionExist(video, language, res) {
    const videoCaption = await VideoCaptionModel.loadByVideoIdAndLanguage(video.id, language);
    if (!videoCaption) {
        res.fail({
            status: HttpStatusCode.NOT_FOUND_404,
            message: 'Video caption not found'
        });
        return false;
    }
    res.locals.videoCaption = videoCaption;
    return true;
}
export { doesVideoCaptionExist };
//# sourceMappingURL=video-captions.js.map