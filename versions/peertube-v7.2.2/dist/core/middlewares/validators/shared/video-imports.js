import { VideoImportModel } from '../../../models/video/video-import.js';
import { HttpStatusCode } from '@peertube/peertube-models';
async function doesVideoImportExist(id, res) {
    const videoImport = await VideoImportModel.loadAndPopulateVideo(id);
    if (!videoImport) {
        res.fail({
            status: HttpStatusCode.NOT_FOUND_404,
            message: 'Video import not found'
        });
        return false;
    }
    res.locals.videoImport = videoImport;
    return true;
}
export { doesVideoImportExist };
//# sourceMappingURL=video-imports.js.map