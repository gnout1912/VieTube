import { forceNumber, maxBy } from '@peertube/peertube-core-utils';
import { FileStorage, HttpStatusCode, VideoResolution, VideoStreamingPlaylistType } from '@peertube/peertube-models';
import { exists } from '../helpers/custom-validators/misc.js';
import { logger, loggerTagsFactory } from '../helpers/logger.js';
import { CONFIG } from '../initializers/config.js';
import { VideoTorrentsSimpleFileCache } from '../lib/files-cache/index.js';
import { generateHLSFilePresignedUrl, generateOriginalFilePresignedUrl, generateUserExportPresignedUrl, generateWebVideoPresignedUrl } from '../lib/object-storage/index.js';
import { getFSUserExportFilePath } from '../lib/paths.js';
import { Hooks } from '../lib/plugins/hooks.js';
import { VideoDownload } from '../lib/video-download.js';
import { VideoPathManager } from '../lib/video-path-manager.js';
import cors from 'cors';
import express from 'express';
import { DOWNLOAD_PATHS, WEBSERVER } from '../initializers/constants.js';
import { asyncMiddleware, buildRateLimiter, optionalAuthenticate, originalVideoFileDownloadValidator, userExportDownloadValidator, videosDownloadValidator, videosGenerateDownloadValidator } from '../middlewares/index.js';
const lTags = loggerTagsFactory('download');
const downloadRouter = express.Router();
downloadRouter.use(cors());
downloadRouter.use(DOWNLOAD_PATHS.TORRENTS + ':filename', asyncMiddleware(downloadTorrent));
downloadRouter.use(DOWNLOAD_PATHS.WEB_VIDEOS + ':id-:resolution([0-9]+).:extension', optionalAuthenticate, asyncMiddleware(videosDownloadValidator), asyncMiddleware(downloadWebVideoFile));
downloadRouter.use(DOWNLOAD_PATHS.HLS_VIDEOS + ':id-:resolution([0-9]+)-fragmented.:extension', optionalAuthenticate, asyncMiddleware(videosDownloadValidator), asyncMiddleware(downloadHLSVideoFile));
const downloadGenerateRateLimiter = buildRateLimiter({
    windowMs: CONFIG.RATES_LIMIT.DOWNLOAD_GENERATE_VIDEO.WINDOW_MS,
    max: CONFIG.RATES_LIMIT.DOWNLOAD_GENERATE_VIDEO.MAX,
    skipFailedRequests: true
});
downloadRouter.use([DOWNLOAD_PATHS.GENERATE_VIDEO + ':id.m4a', DOWNLOAD_PATHS.GENERATE_VIDEO + ':id.mp4', DOWNLOAD_PATHS.GENERATE_VIDEO + ':id'], downloadGenerateRateLimiter, optionalAuthenticate, asyncMiddleware(videosDownloadValidator), videosGenerateDownloadValidator, asyncMiddleware(downloadGeneratedVideoFile));
downloadRouter.use(DOWNLOAD_PATHS.USER_EXPORTS + ':filename', asyncMiddleware(userExportDownloadValidator), asyncMiddleware(downloadUserExport));
downloadRouter.use(DOWNLOAD_PATHS.ORIGINAL_VIDEO_FILE + ':filename', optionalAuthenticate, asyncMiddleware(originalVideoFileDownloadValidator), asyncMiddleware(downloadOriginalFile));
export { downloadRouter };
async function downloadTorrent(req, res) {
    const result = await VideoTorrentsSimpleFileCache.Instance.getFilePath(req.params.filename);
    if (!result) {
        return res.fail({
            status: HttpStatusCode.NOT_FOUND_404,
            message: 'Torrent file not found'
        });
    }
    const allowParameters = {
        req,
        res,
        torrentPath: result.path,
        downloadName: result.downloadName
    };
    const allowedResult = await Hooks.wrapFun(isTorrentDownloadAllowed, allowParameters, 'filter:api.download.torrent.allowed.result');
    if (!checkAllowResult(res, allowParameters, allowedResult))
        return;
    return res.download(result.path, result.downloadName);
}
async function downloadWebVideoFile(req, res) {
    const video = res.locals.videoAll;
    const videoFile = getVideoFileFromReq(req, video.VideoFiles);
    if (!videoFile) {
        return res.fail({
            status: HttpStatusCode.NOT_FOUND_404,
            message: 'Video file not found'
        });
    }
    const allowParameters = {
        req,
        res,
        video,
        videoFile
    };
    const allowedResult = await Hooks.wrapFun(isVideoDownloadAllowed, allowParameters, 'filter:api.download.video.allowed.result');
    if (!checkAllowResult(res, allowParameters, allowedResult))
        return;
    const downloadFilename = buildDownloadFilename({ video, resolution: videoFile.resolution, extname: videoFile.extname });
    if (videoFile.storage === FileStorage.OBJECT_STORAGE) {
        return redirectVideoDownloadToObjectStorage({ res, video, file: videoFile, downloadFilename });
    }
    await VideoPathManager.Instance.makeAvailableVideoFile(videoFile.withVideoOrPlaylist(video), path => {
        return res.download(path, downloadFilename);
    });
}
async function downloadHLSVideoFile(req, res) {
    const video = res.locals.videoAll;
    const streamingPlaylist = getHLSPlaylist(video);
    if (!streamingPlaylist)
        return res.sendStatus(HttpStatusCode.NOT_FOUND_404);
    const videoFile = getVideoFileFromReq(req, streamingPlaylist.VideoFiles);
    if (!videoFile) {
        return res.fail({
            status: HttpStatusCode.NOT_FOUND_404,
            message: 'Video file not found'
        });
    }
    const allowParameters = {
        req,
        res,
        video,
        streamingPlaylist,
        videoFile
    };
    const allowedResult = await Hooks.wrapFun(isVideoDownloadAllowed, allowParameters, 'filter:api.download.video.allowed.result');
    if (!checkAllowResult(res, allowParameters, allowedResult))
        return;
    const downloadFilename = buildDownloadFilename({ video, streamingPlaylist, resolution: videoFile.resolution, extname: videoFile.extname });
    if (videoFile.storage === FileStorage.OBJECT_STORAGE) {
        return redirectVideoDownloadToObjectStorage({ res, video, streamingPlaylist, file: videoFile, downloadFilename });
    }
    await VideoPathManager.Instance.makeAvailableVideoFile(videoFile.withVideoOrPlaylist(streamingPlaylist), path => {
        return res.download(path, downloadFilename);
    });
}
async function downloadGeneratedVideoFile(req, res) {
    const video = res.locals.videoAll;
    const filesToSelect = req.query.videoFileIds;
    const videoFiles = video.getAllFiles()
        .filter(f => filesToSelect.includes(f.id));
    if (videoFiles.length === 0) {
        return res.fail({
            status: HttpStatusCode.NOT_FOUND_404,
            message: `No files found (${filesToSelect.join(', ')}) to download video ${video.url}`
        });
    }
    if (videoFiles.filter(f => f.hasVideo()).length > 1 || videoFiles.filter(f => f.hasAudio()).length > 1) {
        return res.fail({
            status: HttpStatusCode.BAD_REQUEST_400,
            message: `Cannot generate a container with multiple video/audio files. PeerTube supports a maximum of 1 audio and 1 video file`
        });
    }
    const allowParameters = {
        req,
        res,
        video,
        videoFiles
    };
    const allowedResult = await Hooks.wrapFun(isGeneratedVideoDownloadAllowed, allowParameters, 'filter:api.download.generated-video.allowed.result');
    if (!checkAllowResult(res, allowParameters, allowedResult))
        return;
    if (VideoDownload.totalDownloads > CONFIG.DOWNLOAD_GENERATE_VIDEO.MAX_PARALLEL_DOWNLOADS) {
        return res.fail({
            status: HttpStatusCode.TOO_MANY_REQUESTS_429,
            message: `Too many parallel downloads on this server. Please try again later.`
        });
    }
    const maxResolutionFile = maxBy(videoFiles, 'resolution');
    const extname = maxResolutionFile.resolution === VideoResolution.H_NOVIDEO && maxResolutionFile.extname === '.mp4'
        ? '.m4a'
        : maxResolutionFile.extname;
    const urlPath = new URL(req.originalUrl, WEBSERVER.URL).pathname;
    if (!urlPath.endsWith('.mp4') && !urlPath.endsWith('.m4a')) {
        const downloadFilename = buildDownloadFilename({ video, extname });
        res.setHeader('Content-disposition', `attachment; filename="${encodeURI(downloadFilename)}`);
    }
    res.type(extname);
    await new VideoDownload({ video, videoFiles }).muxToMergeVideoFiles(res);
}
function downloadUserExport(req, res) {
    const userExport = res.locals.userExport;
    const downloadFilename = userExport.filename;
    if (userExport.storage === FileStorage.OBJECT_STORAGE) {
        return redirectUserExportToObjectStorage({ res, userExport, downloadFilename });
    }
    res.download(getFSUserExportFilePath(userExport), downloadFilename);
    return Promise.resolve();
}
function downloadOriginalFile(req, res) {
    const videoSource = res.locals.videoSource;
    const downloadFilename = videoSource.inputFilename;
    if (videoSource.storage === FileStorage.OBJECT_STORAGE) {
        return redirectOriginalFileToObjectStorage({ res, videoSource, downloadFilename });
    }
    res.download(VideoPathManager.Instance.getFSOriginalVideoFilePath(videoSource.keptOriginalFilename), downloadFilename);
    return Promise.resolve();
}
function getVideoFileFromReq(req, files) {
    const resolution = forceNumber(req.params.resolution);
    return files.find(f => f.resolution === resolution);
}
function getHLSPlaylist(video) {
    const playlist = video.VideoStreamingPlaylists.find(p => p.type === VideoStreamingPlaylistType.HLS);
    if (!playlist)
        return undefined;
    return Object.assign(playlist, { Video: video });
}
function isTorrentDownloadAllowed(_object) {
    return { allowed: true };
}
function isVideoDownloadAllowed(_object) {
    return { allowed: true };
}
function isGeneratedVideoDownloadAllowed(_object) {
    return { allowed: true };
}
function checkAllowResult(res, allowParameters, result) {
    if (!result || result.allowed !== true) {
        logger.info('Download is not allowed.', Object.assign({ result, allowParameters }, lTags()));
        res.fail({
            status: HttpStatusCode.FORBIDDEN_403,
            message: (result === null || result === void 0 ? void 0 : result.errorMessage) || 'Refused download'
        });
        return false;
    }
    return true;
}
async function redirectVideoDownloadToObjectStorage(options) {
    const { res, video, streamingPlaylist, file, downloadFilename } = options;
    const url = streamingPlaylist
        ? await generateHLSFilePresignedUrl({ streamingPlaylist, file, downloadFilename })
        : await generateWebVideoPresignedUrl({ file, downloadFilename });
    logger.debug('Generating pre-signed URL %s for video %s', url, video.uuid, lTags());
    return res.redirect(url);
}
async function redirectUserExportToObjectStorage(options) {
    const { res, downloadFilename, userExport } = options;
    const url = await generateUserExportPresignedUrl({ userExport, downloadFilename });
    logger.debug('Generating pre-signed URL %s for user export %s', url, userExport.filename, lTags());
    return res.redirect(url);
}
async function redirectOriginalFileToObjectStorage(options) {
    const { res, downloadFilename, videoSource } = options;
    const url = await generateOriginalFilePresignedUrl({ videoSource, downloadFilename });
    logger.debug('Generating pre-signed URL %s for original video file %s', url, videoSource.keptOriginalFilename, lTags());
    return res.redirect(url);
}
function buildDownloadFilename(options) {
    const { video, resolution, extname, streamingPlaylist } = options;
    const videoName = video.name.replace(/[/\\]/g, '_');
    const suffixStr = streamingPlaylist
        ? `-${streamingPlaylist.getStringType()}`
        : '';
    const resolutionStr = exists(resolution)
        ? `-${resolution}p`
        : '';
    return videoName + resolutionStr + suffixStr + extname;
}
//# sourceMappingURL=download.js.map