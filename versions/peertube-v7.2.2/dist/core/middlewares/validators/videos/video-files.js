import { HttpStatusCode, VideoResolution } from '@peertube/peertube-models';
import { isIdValid } from '../../../helpers/custom-validators/misc.js';
import { param } from 'express-validator';
import { areValidationErrors, doesVideoExist, isValidVideoIdParam } from '../shared/index.js';
export const videoFilesDeleteWebVideoValidator = [
    isValidVideoIdParam('id'),
    async (req, res, next) => {
        if (areValidationErrors(req, res))
            return;
        if (!await doesVideoExist(req.params.id, res))
            return;
        const video = res.locals.videoAll;
        if (!checkLocalVideo(video, res))
            return;
        if (!video.hasWebVideoFiles()) {
            return res.fail({
                status: HttpStatusCode.BAD_REQUEST_400,
                message: 'This video does not have Web Video files'
            });
        }
        if (!video.getHLSPlaylist()) {
            return res.fail({
                status: HttpStatusCode.BAD_REQUEST_400,
                message: 'Cannot delete Web Video files since this video does not have HLS playlist'
            });
        }
        return next();
    }
];
export const videoFilesDeleteWebVideoFileValidator = [
    isValidVideoIdParam('id'),
    param('videoFileId')
        .custom(isIdValid),
    async (req, res, next) => {
        if (areValidationErrors(req, res))
            return;
        if (!await doesVideoExist(req.params.id, res))
            return;
        const video = res.locals.videoAll;
        if (!checkLocalVideo(video, res))
            return;
        const files = video.VideoFiles;
        if (!files.find(f => f.id === +req.params.videoFileId)) {
            return res.fail({
                status: HttpStatusCode.NOT_FOUND_404,
                message: 'This video does not have this Web Video file id'
            });
        }
        if (files.length === 1 && !video.getHLSPlaylist()) {
            return res.fail({
                status: HttpStatusCode.BAD_REQUEST_400,
                message: 'Cannot delete Web Video files since this video does not have HLS playlist'
            });
        }
        return next();
    }
];
export const videoFilesDeleteHLSValidator = [
    isValidVideoIdParam('id'),
    async (req, res, next) => {
        if (areValidationErrors(req, res))
            return;
        if (!await doesVideoExist(req.params.id, res))
            return;
        const video = res.locals.videoAll;
        if (!checkLocalVideo(video, res))
            return;
        if (!video.getHLSPlaylist()) {
            return res.fail({
                status: HttpStatusCode.BAD_REQUEST_400,
                message: 'This video does not have HLS files'
            });
        }
        if (!video.hasWebVideoFiles()) {
            return res.fail({
                status: HttpStatusCode.BAD_REQUEST_400,
                message: 'Cannot delete HLS playlist since this video does not have Web Video files'
            });
        }
        return next();
    }
];
export const videoFilesDeleteHLSFileValidator = [
    isValidVideoIdParam('id'),
    param('videoFileId')
        .custom(isIdValid),
    async (req, res, next) => {
        if (areValidationErrors(req, res))
            return;
        if (!await doesVideoExist(req.params.id, res))
            return;
        const video = res.locals.videoAll;
        if (!checkLocalVideo(video, res))
            return;
        const hls = video.getHLSPlaylist();
        if (!hls) {
            return res.fail({
                status: HttpStatusCode.BAD_REQUEST_400,
                message: 'This video does not have HLS files'
            });
        }
        const hlsFiles = hls.VideoFiles;
        const file = hlsFiles.find(f => f.id === +req.params.videoFileId);
        if (!file) {
            return res.fail({
                status: HttpStatusCode.NOT_FOUND_404,
                message: 'This HLS playlist does not have this file id'
            });
        }
        if (hlsFiles.length === 1 && !video.hasWebVideoFiles()) {
            return res.fail({
                status: HttpStatusCode.BAD_REQUEST_400,
                message: 'Cannot delete last HLS playlist file since this video does not have Web Video files'
            });
        }
        if (hls.hasAudioAndVideoSplitted() && file.resolution === VideoResolution.H_NOVIDEO) {
            return res.fail({
                status: HttpStatusCode.BAD_REQUEST_400,
                message: 'Cannot delete audio file of HLS playlist with splitted audio/video. Delete all the videos first'
            });
        }
        return next();
    }
];
function checkLocalVideo(video, res) {
    if (video.remote) {
        res.fail({
            status: HttpStatusCode.BAD_REQUEST_400,
            message: 'Cannot delete files of remote video'
        });
        return false;
    }
    return true;
}
//# sourceMappingURL=video-files.js.map