import { body, param } from 'express-validator';
import { isUrlValid } from '../../../helpers/custom-validators/activitypub/misc.js';
import { CONFIG } from '../../../initializers/config.js';
import { VideoChannelSyncModel } from '../../../models/video/video-channel-sync.js';
import { HttpStatusCode } from '@peertube/peertube-models';
import { areValidationErrors, doesChannelIdExist } from '../shared/index.js';
import { doesVideoChannelSyncIdExist } from '../shared/video-channel-syncs.js';
export const ensureSyncIsEnabled = (req, res, next) => {
    if (!CONFIG.IMPORT.VIDEO_CHANNEL_SYNCHRONIZATION.ENABLED) {
        return res.fail({
            status: HttpStatusCode.FORBIDDEN_403,
            message: 'Synchronization is impossible as video channel synchronization is not enabled on the server'
        });
    }
    return next();
};
export const videoChannelSyncValidator = [
    body('externalChannelUrl')
        .custom(isUrlValid),
    body('videoChannelId')
        .isInt(),
    async (req, res, next) => {
        if (areValidationErrors(req, res))
            return;
        const body = req.body;
        if (!await doesChannelIdExist({ id: body.videoChannelId, checkManage: true, checkIsLocal: true, res }))
            return;
        const count = await VideoChannelSyncModel.countByAccount(res.locals.videoChannel.accountId);
        if (count >= CONFIG.IMPORT.VIDEO_CHANNEL_SYNCHRONIZATION.MAX_PER_USER) {
            return res.fail({
                message: `You cannot create more than ${CONFIG.IMPORT.VIDEO_CHANNEL_SYNCHRONIZATION.MAX_PER_USER} channel synchronizations`
            });
        }
        return next();
    }
];
export const ensureSyncExists = [
    param('id').exists().isInt().withMessage('Should have an sync id'),
    async (req, res, next) => {
        if (areValidationErrors(req, res))
            return;
        if (!await doesVideoChannelSyncIdExist(+req.params.id, res))
            return;
        if (!await doesChannelIdExist({ id: res.locals.videoChannelSync.videoChannelId, checkManage: true, checkIsLocal: true, res }))
            return;
        return next();
    }
];
//# sourceMappingURL=video-channel-sync.js.map