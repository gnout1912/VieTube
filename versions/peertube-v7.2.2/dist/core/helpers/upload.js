import { join } from 'path';
import { DIRECTORIES } from '../initializers/constants.js';
function getResumableUploadPath(filename) {
    if (filename)
        return join(DIRECTORIES.RESUMABLE_UPLOAD, filename);
    return DIRECTORIES.RESUMABLE_UPLOAD;
}
export { getResumableUploadPath };
//# sourceMappingURL=upload.js.map