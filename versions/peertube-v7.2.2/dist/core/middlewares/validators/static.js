import { HttpStatusCode } from '@peertube/peertube-models';
import { exists, isSafeFilename, isSafePeerTubeFilenameWithoutExtension, isUUIDValid, toBooleanOrNull } from '../../helpers/custom-validators/misc.js';
import { logger } from '../../helpers/logger.js';
import { LRU_CACHE } from '../../initializers/constants.js';
import { VideoFileModel } from '../../models/video/video-file.js';
import { VideoModel } from '../../models/video/video.js';
import { param, query } from 'express-validator';
import { LRUCache } from 'lru-cache';
import { basename } from 'path';
import { areValidationErrors, checkCanAccessVideoStaticFiles, isValidVideoPasswordHeader } from './shared/index.js';
const staticFileTokenBypass = new LRUCache({
    max: LRU_CACHE.STATIC_VIDEO_FILES_RIGHTS_CHECK.MAX_SIZE,
    ttl: LRU_CACHE.STATIC_VIDEO_FILES_RIGHTS_CHECK.TTL
});
export const ensureCanAccessVideoPrivateWebVideoFiles = [
    query('videoFileToken').optional().custom(exists),
    isValidVideoPasswordHeader(),
    async (req, res, next) => {
        if (areValidationErrors(req, res))
            return;
        const token = extractTokenOrDie(req, res);
        if (!token)
            return;
        const cacheKey = token + '-' + req.originalUrl;
        if (staticFileTokenBypass.has(cacheKey)) {
            const { allowed, file, video } = staticFileTokenBypass.get(cacheKey);
            if (allowed === true) {
                res.locals.onlyVideo = video;
                res.locals.videoFile = file;
                return next();
            }
            return res.sendStatus(HttpStatusCode.FORBIDDEN_403);
        }
        const result = await isWebVideoAllowed(req, res);
        staticFileTokenBypass.set(cacheKey, result);
        if (result.allowed !== true)
            return;
        res.locals.onlyVideo = result.video;
        res.locals.videoFile = result.file;
        return next();
    }
];
export const privateM3U8PlaylistValidator = [
    param('videoUUID')
        .custom(isUUIDValid),
    param('playlistNameWithoutExtension')
        .custom(v => isSafePeerTubeFilenameWithoutExtension(v)),
    query('reinjectVideoFileToken')
        .optional()
        .customSanitizer(toBooleanOrNull)
        .isBoolean().withMessage('Should be a valid reinjectVideoFileToken boolean'),
    (req, res, next) => {
        if (areValidationErrors(req, res))
            return;
        return next();
    }
];
export const privateHLSFileValidator = [
    param('videoUUID')
        .custom(isUUIDValid),
    param('filename')
        .custom(v => isSafeFilename(v)),
    (req, res, next) => {
        if (areValidationErrors(req, res))
            return;
        return next();
    }
];
export const ensureCanAccessPrivateVideoHLSFiles = [
    query('videoFileToken')
        .optional()
        .custom(exists),
    isValidVideoPasswordHeader(),
    async (req, res, next) => {
        if (areValidationErrors(req, res))
            return;
        const videoUUID = req.params.videoUUID;
        const token = extractTokenOrDie(req, res);
        if (!token)
            return;
        const cacheKey = token + '-' + videoUUID;
        if (staticFileTokenBypass.has(cacheKey)) {
            const { allowed, file, playlist, video } = staticFileTokenBypass.get(cacheKey);
            if (allowed === true) {
                res.locals.onlyVideo = video;
                res.locals.videoFile = file;
                res.locals.videoStreamingPlaylist = playlist;
                return next();
            }
            return res.sendStatus(HttpStatusCode.FORBIDDEN_403);
        }
        const result = await isHLSAllowed(req, res, videoUUID);
        staticFileTokenBypass.set(cacheKey, result);
        if (result.allowed !== true)
            return;
        res.locals.onlyVideo = result.video;
        res.locals.videoFile = result.file;
        res.locals.videoStreamingPlaylist = result.playlist;
        return next();
    }
];
async function isWebVideoAllowed(req, res) {
    const filename = basename(req.path);
    const file = await VideoFileModel.loadWithVideoByFilename(filename);
    if (!file) {
        logger.debug('Unknown static file %s to serve', req.originalUrl, { filename });
        res.sendStatus(HttpStatusCode.FORBIDDEN_403);
        return { allowed: false };
    }
    const video = await VideoModel.loadWithBlacklist(file.getVideo().id);
    return {
        file,
        video,
        allowed: await checkCanAccessVideoStaticFiles({ req, res, video, paramId: video.uuid })
    };
}
async function isHLSAllowed(req, res, videoUUID) {
    const filename = basename(req.path);
    const video = await VideoModel.loadAndPopulateAccountAndFiles(videoUUID);
    if (!video) {
        logger.debug('Unknown static file %s to serve', req.originalUrl, { videoUUID });
        res.sendStatus(HttpStatusCode.FORBIDDEN_403);
        return { allowed: false };
    }
    const file = await VideoFileModel.loadByFilename(filename);
    return {
        file,
        video,
        playlist: video.getHLSPlaylist(),
        allowed: await checkCanAccessVideoStaticFiles({ req, res, video, paramId: video.uuid })
    };
}
function extractTokenOrDie(req, res) {
    var _a;
    const token = req.header('x-peertube-video-password') || req.query.videoFileToken || ((_a = res.locals.oauth) === null || _a === void 0 ? void 0 : _a.token.accessToken);
    if (!token) {
        return res.fail({
            message: 'Video password header, video file token query parameter and bearer token are all missing',
            status: HttpStatusCode.FORBIDDEN_403
        });
    }
    return token;
}
//# sourceMappingURL=static.js.map