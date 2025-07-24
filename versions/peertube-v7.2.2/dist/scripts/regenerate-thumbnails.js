import Bluebird from 'bluebird';
import { program } from 'commander';
import { pathExists, remove } from 'fs-extra/esm';
import { generateImageFilename, processImage } from '../core/helpers/image-utils.js';
import { THUMBNAILS_SIZE } from '../core/initializers/constants.js';
import { initDatabaseModels } from '../core/initializers/database.js';
import { VideoModel } from '../core/models/video/video.js';
program
    .description('Regenerate local thumbnails using preview files')
    .parse(process.argv);
run()
    .then(() => process.exit(0))
    .catch(err => console.error(err));
async function run() {
    await initDatabaseModels(true);
    const ids = await VideoModel.listLocalIds();
    await Bluebird.map(ids, id => {
        return processVideo(id)
            .catch(err => console.error('Cannot process video %d.', id, err));
    }, { concurrency: 20 });
}
async function processVideo(id) {
    const video = await VideoModel.loadWithFiles(id);
    console.log('Processing video %s.', video.name);
    const thumbnail = video.getMiniature();
    const preview = video.getPreview();
    const previewPath = preview.getPath();
    if (!await pathExists(previewPath)) {
        throw new Error(`Preview ${previewPath} does not exist on disk`);
    }
    const size = {
        width: THUMBNAILS_SIZE.width,
        height: THUMBNAILS_SIZE.height
    };
    const oldPath = thumbnail.getPath();
    thumbnail.filename = generateImageFilename();
    thumbnail.width = size.width;
    thumbnail.height = size.height;
    const thumbnailPath = thumbnail.getPath();
    await processImage({ path: previewPath, destination: thumbnailPath, newSize: size, keepOriginal: true });
    await thumbnail.save();
    await remove(oldPath);
}
//# sourceMappingURL=regenerate-thumbnails.js.map