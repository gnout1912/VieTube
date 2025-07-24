import { HttpStatusCode, ServerErrorCode } from '@peertube/peertube-models';
import { isBooleanValid, toBooleanOrNull } from '../../../helpers/custom-validators/misc.js';
import { isValidCreateTranscodingType } from '../../../helpers/custom-validators/video-transcoding.js';
import { CONFIG } from '../../../initializers/config.js';
import { VideoJobInfoModel } from '../../../models/video/video-job-info.js';
import { body } from 'express-validator';
import { areValidationErrors, doesVideoExist, isValidVideoIdParam } from '../shared/index.js';
import { checkVideoCanBeTranscribedOrTranscripted } from './shared/video-validators.js';
const createTranscodingValidator = [
    isValidVideoIdParam('videoId'),
    body('transcodingType')
        .custom(isValidCreateTranscodingType),
    body('forceTranscoding')
        .optional()
        .customSanitizer(toBooleanOrNull)
        .custom(isBooleanValid),
    async (req, res, next) => {
        if (areValidationErrors(req, res))
            return;
        if (!await doesVideoExist(req.params.videoId, res, 'all'))
            return;
        const video = res.locals.videoAll;
        if (!checkVideoCanBeTranscribedOrTranscripted(video, res))
            return;
        if (CONFIG.TRANSCODING.ENABLED !== true) {
            return res.fail({
                status: HttpStatusCode.BAD_REQUEST_400,
                message: 'Cannot run transcoding job because transcoding is disabled on this instance'
            });
        }
        const body = req.body;
        if (body.forceTranscoding === true)
            return next();
        const info = await VideoJobInfoModel.load(video.id);
        if (info && info.pendingTranscode > 0) {
            return res.fail({
                status: HttpStatusCode.CONFLICT_409,
                type: ServerErrorCode.VIDEO_ALREADY_BEING_TRANSCODED,
                message: 'This video is already being transcoded'
            });
        }
        return next();
    }
];
export { createTranscodingValidator };
//# sourceMappingURL=video-transcoding.js.map