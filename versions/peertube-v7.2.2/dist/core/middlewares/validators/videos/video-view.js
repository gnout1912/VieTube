import { HttpStatusCode } from '@peertube/peertube-models';
import { isVideoTimeValid, isVideoViewEvent, isVideoViewUAInfo, toVideoViewUADeviceOrNull } from '../../../helpers/custom-validators/video-view.js';
import { getCachedVideoDuration } from '../../../lib/video.js';
import { LocalVideoViewerModel } from '../../../models/view/local-video-viewer.js';
import { body, param } from 'express-validator';
import { isIdValid, toIntOrNull } from '../../../helpers/custom-validators/misc.js';
import { areValidationErrors, doesVideoExist, isValidVideoIdParam } from '../shared/index.js';
const tags = ['views'];
export const getVideoLocalViewerValidator = [
    param('localViewerId')
        .custom(isIdValid),
    async (req, res, next) => {
        if (areValidationErrors(req, res, { tags }))
            return;
        const localViewer = await LocalVideoViewerModel.loadFullById(+req.params.localViewerId);
        if (!localViewer) {
            return res.fail({
                status: HttpStatusCode.NOT_FOUND_404,
                message: 'Local viewer not found',
                tags
            });
        }
        res.locals.localViewerFull = localViewer;
        return next();
    }
];
export const videoViewValidator = [
    isValidVideoIdParam('videoId'),
    body('currentTime')
        .customSanitizer(toIntOrNull)
        .isInt(),
    body('sessionId')
        .optional()
        .isAlphanumeric(undefined, { ignore: '-' }),
    body('viewEvent')
        .optional()
        .custom(isVideoViewEvent),
    body('client')
        .optional()
        .custom(isVideoViewUAInfo),
    body('device')
        .optional()
        .customSanitizer(toVideoViewUADeviceOrNull),
    body('operatingSystem')
        .optional()
        .custom(isVideoViewUAInfo),
    async (req, res, next) => {
        if (areValidationErrors(req, res, { tags }))
            return;
        if (!await doesVideoExist(req.params.videoId, res, 'unsafe-only-immutable-attributes'))
            return;
        const video = res.locals.onlyImmutableVideo;
        const { duration } = await getCachedVideoDuration(video.id);
        const currentTime = req.body.currentTime;
        if (!isVideoTimeValid(currentTime, duration)) {
            return res.fail({
                status: HttpStatusCode.BAD_REQUEST_400,
                message: `Current time ${currentTime} is invalid (video ${video.uuid} duration: ${duration})`,
                logLevel: 'warn',
                tags
            });
        }
        return next();
    }
];
//# sourceMappingURL=video-view.js.map