import { canVideoFileBeEdited } from '@peertube/peertube-core-utils';
import { HttpStatusCode, ServerErrorCode, VideoState } from '@peertube/peertube-models';
import { isVideoFileMimeTypeValid, isVideoFileSizeValid } from '../../../../helpers/custom-validators/videos.js';
import { logger } from '../../../../helpers/logger.js';
import { CONSTRAINTS_FIELDS, VIDEO_STATES } from '../../../../initializers/constants.js';
import { isLocalVideoFileAccepted } from '../../../../lib/moderation.js';
import { Hooks } from '../../../../lib/plugins/hooks.js';
import { checkUserQuota } from '../../shared/index.js';
export async function commonVideoFileChecks(options) {
    const { res, user, videoFileSize, files } = options;
    if (!isVideoFileMimeTypeValid(files)) {
        res.fail({
            status: HttpStatusCode.UNSUPPORTED_MEDIA_TYPE_415,
            message: `This file is not supported. Please, make sure it is of the following type: ${CONSTRAINTS_FIELDS.VIDEOS.EXTNAME.join(', ')}`
        });
        return false;
    }
    if (!isVideoFileSizeValid(videoFileSize.toString())) {
        res.fail({
            status: HttpStatusCode.PAYLOAD_TOO_LARGE_413,
            message: 'This file is too large. It exceeds the maximum file size authorized.',
            type: ServerErrorCode.MAX_FILE_SIZE_REACHED
        });
        return false;
    }
    if (await checkUserQuota(user, videoFileSize, res) === false)
        return false;
    return true;
}
export async function isVideoFileAccepted(options) {
    const { req, res, videoFile, hook } = options;
    const acceptParameters = {
        videoBody: req.body,
        videoFile,
        user: res.locals.oauth.token.User
    };
    const acceptedResult = await Hooks.wrapFun(isLocalVideoFileAccepted, acceptParameters, hook);
    if (!acceptedResult || acceptedResult.accepted !== true) {
        logger.info('Refused local video file.', { acceptedResult, acceptParameters });
        res.fail({
            status: HttpStatusCode.FORBIDDEN_403,
            message: acceptedResult.errorMessage || 'Refused local video file'
        });
        return false;
    }
    return true;
}
export function checkVideoFileCanBeEdited(video, res) {
    if (video.isLive) {
        res.fail({
            status: HttpStatusCode.BAD_REQUEST_400,
            message: 'Cannot edit a live video'
        });
        return false;
    }
    if (video.state === VideoState.TO_TRANSCODE || video.state === VideoState.TO_EDIT) {
        res.fail({
            status: HttpStatusCode.CONFLICT_409,
            message: 'Cannot edit video that is already waiting for transcoding/edition'
        });
        return false;
    }
    if (!canVideoFileBeEdited(video.state)) {
        res.fail({
            status: HttpStatusCode.BAD_REQUEST_400,
            message: 'Video state is not compatible with edition'
        });
        return false;
    }
    return true;
}
export function checkVideoCanBeTranscribedOrTranscripted(video, res) {
    if (video.remote) {
        res.fail({
            status: HttpStatusCode.BAD_REQUEST_400,
            message: 'Cannot run this task on a remote video'
        });
        return false;
    }
    if (video.isLive) {
        res.fail({
            status: HttpStatusCode.BAD_REQUEST_400,
            message: 'Cannot run this task on a live'
        });
        return false;
    }
    const incompatibleStates = new Set([
        VideoState.TO_IMPORT,
        VideoState.TO_EDIT,
        VideoState.TO_MOVE_TO_EXTERNAL_STORAGE,
        VideoState.TO_MOVE_TO_FILE_SYSTEM
    ]);
    if (incompatibleStates.has(video.state)) {
        res.fail({
            status: HttpStatusCode.BAD_REQUEST_400,
            message: `Cannot run this task on a video with "${VIDEO_STATES[video.state]}" state`
        });
        return false;
    }
    return true;
}
//# sourceMappingURL=video-validators.js.map