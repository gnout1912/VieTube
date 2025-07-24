import { remove } from 'fs-extra/esm';
import { join } from 'path';
import { processImage } from '../../../helpers/image-utils.js';
import { doRequestAndSaveToFile } from '../../../helpers/requests.js';
import { CONFIG } from '../../../initializers/config.js';
async function downloadImage(options) {
    const { url, destDir, destName, size } = options;
    const tmpPath = join(CONFIG.STORAGE.TMP_DIR, 'pending-' + destName);
    await doRequestAndSaveToFile(url, tmpPath);
    const destPath = join(destDir, destName);
    try {
        await processImage({ path: tmpPath, destination: destPath, newSize: size });
    }
    catch (err) {
        await remove(tmpPath);
        throw err;
    }
    return destPath;
}
export default downloadImage;
//# sourceMappingURL=image-downloader.js.map