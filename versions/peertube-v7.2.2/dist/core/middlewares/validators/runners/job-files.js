import { param } from 'express-validator';
import { basename } from 'path';
import { isSafeFilename } from '../../../helpers/custom-validators/misc.js';
import { hasVideoStudioTaskFile, HttpStatusCode } from '@peertube/peertube-models';
import { areValidationErrors, doesVideoExist, isValidVideoIdParam } from '../shared/index.js';
const tags = ['runner'];
export const runnerJobGetVideoTranscodingFileValidator = [
    isValidVideoIdParam('videoId'),
    async (req, res, next) => {
        if (areValidationErrors(req, res))
            return;
        if (!await doesVideoExist(req.params.videoId, res, 'all'))
            return;
        const runnerJob = res.locals.runnerJob;
        if (runnerJob.privatePayload.videoUUID !== res.locals.videoAll.uuid) {
            return res.fail({
                status: HttpStatusCode.FORBIDDEN_403,
                message: 'Job is not associated to this video',
                tags: [...tags, res.locals.videoAll.uuid]
            });
        }
        return next();
    }
];
export const runnerJobGetVideoStudioTaskFileValidator = [
    param('filename').custom(v => isSafeFilename(v)),
    (req, res, next) => {
        if (areValidationErrors(req, res))
            return;
        const filename = req.params.filename;
        const payload = res.locals.runnerJob.payload;
        const found = Array.isArray(payload === null || payload === void 0 ? void 0 : payload.tasks) && payload.tasks.some(t => {
            if (hasVideoStudioTaskFile(t)) {
                return basename(t.options.file) === filename;
            }
            return false;
        });
        if (!found) {
            return res.fail({
                status: HttpStatusCode.BAD_REQUEST_400,
                message: 'File is not associated to this edition task',
                tags: [...tags, res.locals.videoAll.uuid]
            });
        }
        return next();
    }
];
//# sourceMappingURL=job-files.js.map