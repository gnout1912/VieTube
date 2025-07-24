import { join } from 'path';
import { logger } from '../../helpers/logger.js';
import { doRequestAndSaveToFile } from '../../helpers/requests.js';
import { VideoFileModel } from '../../models/video/video-file.js';
import { CONFIG } from '../../initializers/config.js';
import { FILES_CACHE } from '../../initializers/constants.js';
import { VideoModel } from '../../models/video/video.js';
import { AbstractSimpleFileCache } from './shared/abstract-simple-file-cache.js';
class VideoTorrentsSimpleFileCache extends AbstractSimpleFileCache {
    constructor() {
        super();
    }
    static get Instance() {
        return this.instance || (this.instance = new this());
    }
    async getFilePathImpl(filename) {
        const file = await VideoFileModel.loadWithVideoOrPlaylistByTorrentFilename(filename);
        if (!file)
            return undefined;
        if (file.getVideo().isOwned()) {
            const downloadName = this.buildDownloadName(file.getVideo(), file);
            return { isOwned: true, path: join(CONFIG.STORAGE.TORRENTS_DIR, file.torrentFilename), downloadName };
        }
        return this.loadRemoteFile(filename);
    }
    async loadRemoteFile(key) {
        const file = await VideoFileModel.loadWithVideoOrPlaylistByTorrentFilename(key);
        if (!file)
            return undefined;
        if (file.getVideo().isOwned())
            throw new Error('Cannot load remote file of owned video.');
        const video = await VideoModel.loadFull(file.getVideo().id);
        if (!video)
            return undefined;
        const remoteUrl = file.getRemoteTorrentUrl(video);
        const destPath = join(FILES_CACHE.TORRENTS.DIRECTORY, file.torrentFilename);
        try {
            await doRequestAndSaveToFile(remoteUrl, destPath);
            const downloadName = this.buildDownloadName(video, file);
            return { isOwned: false, path: destPath, downloadName };
        }
        catch (err) {
            logger.info('Cannot fetch remote torrent file %s.', remoteUrl, { err });
            return undefined;
        }
    }
    buildDownloadName(video, file) {
        return `${video.name}-${file.resolution}p.torrent`;
    }
}
export { VideoTorrentsSimpleFileCache };
//# sourceMappingURL=video-torrents-simple-file-cache.js.map