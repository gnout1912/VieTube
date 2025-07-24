import { readFile } from 'fs/promises';
import { getFileSize } from '@peertube/peertube-node-utils';
import { CONSTRAINTS_FIELDS, MIMETYPES, VIDEO_LANGUAGES } from '../../initializers/constants.js';
import { logger } from '../logger.js';
import { exists, isFileValid } from './misc.js';
function isVideoCaptionLanguageValid(value) {
    return exists(value) && VIDEO_LANGUAGES[value] !== undefined;
}
const videoCaptionTypesRegex = [...Object.keys(MIMETYPES.VIDEO_CAPTIONS.MIMETYPE_EXT), 'application/octet-stream']
    .map(m => `(${m})`)
    .join('|');
function isVideoCaptionFile(files, field) {
    return isFileValid({
        files,
        mimeTypeRegex: videoCaptionTypesRegex,
        field,
        maxSize: CONSTRAINTS_FIELDS.VIDEO_CAPTIONS.CAPTION_FILE.FILE_SIZE.max
    });
}
async function isVTTFileValid(filePath) {
    const size = await getFileSize(filePath);
    const content = await readFile(filePath, 'utf8');
    logger.debug('Checking VTT file %s', filePath, { size, content });
    if (size > CONSTRAINTS_FIELDS.VIDEO_CAPTIONS.CAPTION_FILE.FILE_SIZE.max)
        return false;
    return content === null || content === void 0 ? void 0 : content.startsWith('WEBVTT');
}
export { isVideoCaptionFile, isVTTFileValid, isVideoCaptionLanguageValid };
//# sourceMappingURL=video-captions.js.map