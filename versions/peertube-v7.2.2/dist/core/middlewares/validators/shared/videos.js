import { HttpStatusCode, ServerErrorCode, UserRight, VideoPrivacy } from '@peertube/peertube-models';
import { exists } from '../../../helpers/custom-validators/misc.js';
import { loadVideo } from '../../../lib/model-loaders/index.js';
import { isUserQuotaValid } from '../../../lib/user.js';
import { VideoTokensManager } from '../../../lib/video-tokens-manager.js';
import { authenticatePromise } from '../../auth.js';
import { VideoChannelModel } from '../../../models/video/video-channel.js';
import { VideoFileModel } from '../../../models/video/video-file.js';
import { VideoPasswordModel } from '../../../models/video/video-password.js';
import { VideoModel } from '../../../models/video/video.js';
export async function doesVideoExist(id, res, fetchType = 'all') {
    const userId = res.locals.oauth ? res.locals.oauth.token.User.id : undefined;
    const video = await loadVideo(id, fetchType, userId);
    if (!video) {
        res.fail({
            status: HttpStatusCode.NOT_FOUND_404,
            message: 'Video not found'
        });
        return false;
    }
    switch (fetchType) {
        case 'for-api':
            res.locals.videoAPI = video;
            break;
        case 'all':
            res.locals.videoAll = video;
            break;
        case 'unsafe-only-immutable-attributes':
            res.locals.onlyImmutableVideo = video;
            break;
        case 'id':
            res.locals.videoId = video;
            break;
        case 'only-video-and-blacklist':
            res.locals.onlyVideo = video;
            break;
    }
    return true;
}
export async function doesVideoFileOfVideoExist(id, videoIdOrUUID, res) {
    if (!await VideoFileModel.doesVideoExistForVideoFile(id, videoIdOrUUID)) {
        res.fail({
            status: HttpStatusCode.NOT_FOUND_404,
            message: 'VideoFile matching Video not found'
        });
        return false;
    }
    return true;
}
export async function doesVideoChannelOfAccountExist(channelId, user, res) {
    const videoChannel = await VideoChannelModel.loadAndPopulateAccount(channelId);
    if (videoChannel === null) {
        res.fail({ message: `Unknown ${channelId} on this instance.` });
        return false;
    }
    if (user.hasRight(UserRight.UPDATE_ANY_VIDEO) === true) {
        res.locals.videoChannel = videoChannel;
        return true;
    }
    if (videoChannel.Account.id !== user.Account.id) {
        res.fail({ message: `Unknown channel ${channelId} for this account.` });
        return false;
    }
    res.locals.videoChannel = videoChannel;
    return true;
}
export async function checkCanSeeVideo(options) {
    const { req, res, video, paramId } = options;
    if (video.requiresUserAuth({ urlParamId: paramId, checkBlacklist: true })) {
        return checkCanSeeUserAuthVideo({ req, res, video });
    }
    if (video.privacy === VideoPrivacy.PASSWORD_PROTECTED) {
        return checkCanSeePasswordProtectedVideo({ req, res, video });
    }
    if (video.privacy === VideoPrivacy.UNLISTED || video.privacy === VideoPrivacy.PUBLIC) {
        return true;
    }
    throw new Error('Unknown video privacy when checking video right ' + video.url);
}
export async function checkCanSeeUserAuthVideo(options) {
    var _a;
    const { req, res, video } = options;
    const fail = () => {
        res.fail({
            status: HttpStatusCode.FORBIDDEN_403,
            message: 'Cannot fetch information of private/internal/blocked video'
        });
        return false;
    };
    await authenticatePromise({ req, res });
    const user = (_a = res.locals.oauth) === null || _a === void 0 ? void 0 : _a.token.User;
    if (!user)
        return fail();
    const videoWithRights = await getVideoWithRights(video);
    const privacy = videoWithRights.privacy;
    if (privacy === VideoPrivacy.INTERNAL) {
        return true;
    }
    if (videoWithRights.isBlacklisted()) {
        if (canUserAccessVideo(user, videoWithRights, UserRight.MANAGE_VIDEO_BLACKLIST))
            return true;
        return fail();
    }
    if (privacy === VideoPrivacy.PRIVATE || privacy === VideoPrivacy.UNLISTED) {
        if (canUserAccessVideo(user, videoWithRights, UserRight.SEE_ALL_VIDEOS))
            return true;
        return fail();
    }
    return fail();
}
export async function checkCanSeePasswordProtectedVideo(options) {
    var _a;
    const { req, res, video } = options;
    const videoWithRights = await getVideoWithRights(video);
    const videoPassword = req.header('x-peertube-video-password');
    if (!exists(videoPassword)) {
        const errorMessage = 'Please provide a password to access this password protected video';
        const errorType = ServerErrorCode.VIDEO_REQUIRES_PASSWORD;
        if (req.header('authorization')) {
            await authenticatePromise({ req, res, errorMessage, errorStatus: HttpStatusCode.FORBIDDEN_403, errorType });
            const user = (_a = res.locals.oauth) === null || _a === void 0 ? void 0 : _a.token.User;
            if (canUserAccessVideo(user, videoWithRights, UserRight.SEE_ALL_VIDEOS))
                return true;
        }
        res.fail({
            status: HttpStatusCode.FORBIDDEN_403,
            type: errorType,
            message: errorMessage
        });
        return false;
    }
    if (await VideoPasswordModel.isACorrectPassword({ videoId: video.id, password: videoPassword }))
        return true;
    res.fail({
        status: HttpStatusCode.FORBIDDEN_403,
        type: ServerErrorCode.INCORRECT_VIDEO_PASSWORD,
        message: 'Incorrect video password. Access to the video is denied.'
    });
    return false;
}
export function canUserAccessVideo(user, video, right) {
    const isOwnedByUser = video.VideoChannel.Account.userId === user.id;
    return isOwnedByUser || user.hasRight(right);
}
export async function getVideoWithRights(video) {
    var _a, _b;
    return ((_b = (_a = video.VideoChannel) === null || _a === void 0 ? void 0 : _a.Account) === null || _b === void 0 ? void 0 : _b.userId)
        ? video
        : VideoModel.loadFull(video.id);
}
export async function checkCanAccessVideoStaticFiles(options) {
    var _a;
    const { video, req, res } = options;
    if (((_a = res.locals.oauth) === null || _a === void 0 ? void 0 : _a.token.User) || exists(req.header('x-peertube-video-password'))) {
        return checkCanSeeVideo(options);
    }
    assignVideoTokenIfNeeded(req, res, video);
    if (res.locals.videoFileToken)
        return true;
    if (!video.hasPrivateStaticPath())
        return true;
    res.sendStatus(HttpStatusCode.FORBIDDEN_403);
    return false;
}
export async function checkCanAccessVideoSourceFile(options) {
    var _a;
    const { req, res, videoId } = options;
    const video = await VideoModel.loadFull(videoId);
    if ((_a = res.locals.oauth) === null || _a === void 0 ? void 0 : _a.token.User) {
        if (canUserAccessVideo(res.locals.oauth.token.User, video, UserRight.SEE_ALL_VIDEOS) === true)
            return true;
        res.sendStatus(HttpStatusCode.FORBIDDEN_403);
        return false;
    }
    assignVideoTokenIfNeeded(req, res, video);
    if (res.locals.videoFileToken)
        return true;
    res.sendStatus(HttpStatusCode.FORBIDDEN_403);
    return false;
}
function assignVideoTokenIfNeeded(req, res, video) {
    const videoFileToken = req.query.videoFileToken;
    if (videoFileToken && VideoTokensManager.Instance.hasToken({ token: videoFileToken, videoUUID: video.uuid })) {
        const user = VideoTokensManager.Instance.getUserFromToken({ token: videoFileToken });
        res.locals.videoFileToken = { user };
    }
}
export function checkUserCanManageVideo(user, video, right, res, onlyOwned = true) {
    if (onlyOwned && video.isOwned() === false) {
        res.fail({
            status: HttpStatusCode.FORBIDDEN_403,
            message: 'Cannot manage a video of another server.'
        });
        return false;
    }
    const account = video.VideoChannel.Account;
    if (user.hasRight(right) === false && account.userId !== user.id) {
        res.fail({
            status: HttpStatusCode.FORBIDDEN_403,
            message: 'Cannot manage a video of another user.'
        });
        return false;
    }
    return true;
}
export async function checkUserQuota(user, videoFileSize, res) {
    if (await isUserQuotaValid({ userId: user.id, uploadSize: videoFileSize }) === false) {
        res.fail({
            status: HttpStatusCode.PAYLOAD_TOO_LARGE_413,
            message: 'The user video quota is exceeded with this video.',
            type: ServerErrorCode.QUOTA_REACHED
        });
        return false;
    }
    return true;
}
//# sourceMappingURL=videos.js.map