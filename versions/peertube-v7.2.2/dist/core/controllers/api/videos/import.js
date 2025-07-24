import express from 'express';
import { move } from 'fs-extra/esm';
import { readFile } from 'fs/promises';
import { decode } from 'magnet-uri';
import parseTorrent from 'parse-torrent';
import { join } from 'path';
import { buildVideoFromImport, buildYoutubeDLImport, insertFromImportIntoDB, YoutubeDlImportError } from '../../../lib/video-pre-import.js';
import { HttpStatusCode, ServerErrorCode, ThumbnailType, VideoImportState } from '@peertube/peertube-models';
import { auditLoggerFactory, getAuditIdFromRes, VideoImportAuditView } from '../../../helpers/audit-logger.js';
import { isArray } from '../../../helpers/custom-validators/misc.js';
import { cleanUpReqFiles, createReqFiles } from '../../../helpers/express-utils.js';
import { logger } from '../../../helpers/logger.js';
import { getSecureTorrentName } from '../../../helpers/utils.js';
import { CONFIG } from '../../../initializers/config.js';
import { MIMETYPES } from '../../../initializers/constants.js';
import { JobQueue } from '../../../lib/job-queue/job-queue.js';
import { updateLocalVideoMiniatureFromExisting } from '../../../lib/thumbnail.js';
import { asyncMiddleware, asyncRetryTransactionMiddleware, authenticate, videoImportAddValidator, videoImportCancelValidator, videoImportDeleteValidator } from '../../../middlewares/index.js';
const auditLogger = auditLoggerFactory('video-imports');
const videoImportsRouter = express.Router();
const reqVideoFileImport = createReqFiles(['thumbnailfile', 'previewfile', 'torrentfile'], Object.assign(Object.assign({}, MIMETYPES.TORRENT.MIMETYPE_EXT), MIMETYPES.IMAGE.MIMETYPE_EXT));
videoImportsRouter.post('/imports', authenticate, reqVideoFileImport, asyncMiddleware(videoImportAddValidator), asyncRetryTransactionMiddleware(handleVideoImport));
videoImportsRouter.post('/imports/:id/cancel', authenticate, asyncMiddleware(videoImportCancelValidator), asyncRetryTransactionMiddleware(cancelVideoImport));
videoImportsRouter.delete('/imports/:id', authenticate, asyncMiddleware(videoImportDeleteValidator), asyncRetryTransactionMiddleware(deleteVideoImport));
export { videoImportsRouter };
async function deleteVideoImport(req, res) {
    const videoImport = res.locals.videoImport;
    await videoImport.destroy();
    return res.sendStatus(HttpStatusCode.NO_CONTENT_204);
}
async function cancelVideoImport(req, res) {
    const videoImport = res.locals.videoImport;
    videoImport.state = VideoImportState.CANCELLED;
    await videoImport.save();
    return res.sendStatus(HttpStatusCode.NO_CONTENT_204);
}
function handleVideoImport(req, res) {
    var _a, _b;
    if (req.body.targetUrl)
        return handleYoutubeDlImport(req, res);
    const file = (_b = (_a = req.files) === null || _a === void 0 ? void 0 : _a['torrentfile']) === null || _b === void 0 ? void 0 : _b[0];
    if (req.body.magnetUri || file)
        return handleTorrentImport(req, res, file);
}
async function handleTorrentImport(req, res, torrentfile) {
    const body = req.body;
    const user = res.locals.oauth.token.User;
    let videoName;
    let torrentName;
    let magnetUri;
    if (torrentfile) {
        const result = await processTorrentOrAbortRequest(req, res, torrentfile);
        if (!result)
            return;
        videoName = result.name;
        torrentName = result.torrentName;
    }
    else {
        const result = processMagnetURI(body);
        magnetUri = result.magnetUri;
        videoName = result.name;
    }
    const video = await buildVideoFromImport({
        channelId: res.locals.videoChannel.id,
        importData: { name: videoName },
        importDataOverride: body,
        importType: 'torrent'
    });
    const thumbnailModel = await processThumbnail(req, video);
    const previewModel = await processPreview(req, video);
    const videoImport = await insertFromImportIntoDB({
        video,
        thumbnailModel,
        previewModel,
        videoChannel: res.locals.videoChannel,
        tags: body.tags || undefined,
        user,
        videoPasswords: body.videoPasswords,
        videoImportAttributes: {
            magnetUri,
            torrentName,
            state: VideoImportState.PENDING,
            userId: user.id
        }
    });
    const payload = {
        type: torrentfile
            ? 'torrent-file'
            : 'magnet-uri',
        videoImportId: videoImport.id,
        preventException: false,
        generateTranscription: body.generateTranscription
    };
    await JobQueue.Instance.createJob({ type: 'video-import', payload });
    auditLogger.create(getAuditIdFromRes(res), new VideoImportAuditView(videoImport.toFormattedJSON()));
    return res.json(videoImport.toFormattedJSON()).end();
}
function statusFromYtDlImportError(err) {
    switch (err.code) {
        case YoutubeDlImportError.CODE.NOT_ONLY_UNICAST_URL:
            return HttpStatusCode.FORBIDDEN_403;
        case YoutubeDlImportError.CODE.FETCH_ERROR:
            return HttpStatusCode.BAD_REQUEST_400;
        default:
            return HttpStatusCode.INTERNAL_SERVER_ERROR_500;
    }
}
async function handleYoutubeDlImport(req, res) {
    var _a, _b, _c, _d;
    const body = req.body;
    const targetUrl = body.targetUrl;
    const user = res.locals.oauth.token.User;
    try {
        const { job, videoImport } = await buildYoutubeDLImport({
            targetUrl,
            channel: res.locals.videoChannel,
            importDataOverride: body,
            thumbnailFilePath: (_b = (_a = req.files) === null || _a === void 0 ? void 0 : _a['thumbnailfile']) === null || _b === void 0 ? void 0 : _b[0].path,
            previewFilePath: (_d = (_c = req.files) === null || _c === void 0 ? void 0 : _c['previewfile']) === null || _d === void 0 ? void 0 : _d[0].path,
            user
        });
        await JobQueue.Instance.createJob(job);
        auditLogger.create(getAuditIdFromRes(res), new VideoImportAuditView(videoImport.toFormattedJSON()));
        return res.json(videoImport.toFormattedJSON()).end();
    }
    catch (err) {
        logger.error('An error occurred while importing the video %s. ', targetUrl, { err });
        return res.fail({
            message: err.message,
            status: statusFromYtDlImportError(err),
            data: {
                targetUrl
            }
        });
    }
}
async function processThumbnail(req, video) {
    const thumbnailField = req.files ? req.files['thumbnailfile'] : undefined;
    if (thumbnailField) {
        const thumbnailPhysicalFile = thumbnailField[0];
        return updateLocalVideoMiniatureFromExisting({
            inputPath: thumbnailPhysicalFile.path,
            video,
            type: ThumbnailType.MINIATURE,
            automaticallyGenerated: false
        });
    }
    return undefined;
}
async function processPreview(req, video) {
    const previewField = req.files ? req.files['previewfile'] : undefined;
    if (previewField) {
        const previewPhysicalFile = previewField[0];
        return updateLocalVideoMiniatureFromExisting({
            inputPath: previewPhysicalFile.path,
            video,
            type: ThumbnailType.PREVIEW,
            automaticallyGenerated: false
        });
    }
    return undefined;
}
async function processTorrentOrAbortRequest(req, res, torrentfile) {
    const torrentName = torrentfile.originalname;
    const newTorrentPath = join(CONFIG.STORAGE.TORRENTS_DIR, getSecureTorrentName(torrentName));
    await move(torrentfile.path, newTorrentPath, { overwrite: true });
    torrentfile.path = newTorrentPath;
    const buf = await readFile(torrentfile.path);
    const parsedTorrent = await parseTorrent(buf);
    if (parsedTorrent.files.length !== 1) {
        cleanUpReqFiles(req);
        res.fail({
            type: ServerErrorCode.INCORRECT_FILES_IN_TORRENT,
            message: 'Torrents with only 1 file are supported.'
        });
        return undefined;
    }
    return {
        name: extractNameFromArray(parsedTorrent.name),
        torrentName
    };
}
function processMagnetURI(body) {
    const magnetUri = body.magnetUri;
    const parsed = decode(magnetUri);
    return {
        name: extractNameFromArray(parsed.name),
        magnetUri
    };
}
function extractNameFromArray(name) {
    return isArray(name) ? name[0] : name;
}
//# sourceMappingURL=import.js.map