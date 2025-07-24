import { move, pathExists, remove } from 'fs-extra/esm';
import { readdir } from 'fs/promises';
import { dirname, join } from 'path';
import { inspect } from 'util';
import { CONFIG } from '../../initializers/config.js';
import { isVideoFileExtnameValid } from '../custom-validators/videos.js';
import { logger, loggerTagsFactory } from '../logger.js';
import { generateVideoImportTmpPath } from '../utils.js';
import { YoutubeDLCLI } from './youtube-dl-cli.js';
import { YoutubeDLInfoBuilder } from './youtube-dl-info-builder.js';
const lTags = loggerTagsFactory('youtube-dl');
const processOptions = {
    maxBuffer: 1024 * 1024 * 30
};
class YoutubeDLWrapper {
    constructor(url, enabledResolutions, useBestFormat) {
        this.url = url;
        this.enabledResolutions = enabledResolutions;
        this.useBestFormat = useBestFormat;
    }
    async getInfoForDownload(youtubeDLArgs = []) {
        const youtubeDL = await YoutubeDLCLI.safeGet();
        const info = await youtubeDL.getInfo({
            url: this.url,
            format: YoutubeDLCLI.getYoutubeDLVideoFormat(this.enabledResolutions, this.useBestFormat),
            additionalYoutubeDLArgs: youtubeDLArgs,
            processOptions
        });
        if (!info)
            throw new Error(`YoutubeDL could not get info from ${this.url}`);
        if (info.is_live === true)
            throw new Error('Cannot download a live streaming.');
        const infoBuilder = new YoutubeDLInfoBuilder(info);
        return infoBuilder.getInfo();
    }
    async getInfoForListImport(options) {
        const youtubeDL = await YoutubeDLCLI.safeGet();
        const list = await youtubeDL.getListInfo({
            url: this.url,
            latestVideosCount: options.latestVideosCount,
            processOptions
        });
        if (!Array.isArray(list))
            throw new Error(`YoutubeDL could not get list info from ${this.url}: ${inspect(list)}`);
        return list.map(info => info.webpage_url);
    }
    async getSubtitles() {
        const cwd = CONFIG.STORAGE.TMP_DIR;
        const youtubeDL = await YoutubeDLCLI.safeGet();
        const files = await youtubeDL.getSubs({ url: this.url, format: 'vtt', processOptions: { cwd } });
        if (!files)
            return [];
        logger.debug('Get subtitles from youtube dl.', Object.assign({ url: this.url, files }, lTags()));
        const subtitles = files.reduce((acc, filename) => {
            const matched = filename.match(/\.([a-z]{2})(-[a-z]+)?\.(vtt|ttml)/i);
            if (!(matched === null || matched === void 0 ? void 0 : matched[1]))
                return acc;
            return [
                ...acc,
                {
                    language: matched[1],
                    path: join(cwd, filename),
                    filename
                }
            ];
        }, []);
        return subtitles;
    }
    async downloadVideo(fileExt, timeout) {
        const pathWithoutExtension = generateVideoImportTmpPath(this.url, '');
        logger.info('Importing youtubeDL video %s to %s', this.url, pathWithoutExtension, lTags());
        const youtubeDL = await YoutubeDLCLI.safeGet();
        try {
            await youtubeDL.download({
                url: this.url,
                format: YoutubeDLCLI.getYoutubeDLVideoFormat(this.enabledResolutions, this.useBestFormat),
                output: pathWithoutExtension,
                timeout,
                processOptions
            });
            if (await pathExists(pathWithoutExtension)) {
                await move(pathWithoutExtension, pathWithoutExtension + '.mp4');
            }
            return this.guessVideoPathWithExtension(pathWithoutExtension, fileExt);
        }
        catch (err) {
            this.guessVideoPathWithExtension(pathWithoutExtension, fileExt)
                .then(path => {
                logger.debug('Error in youtube-dl import, deleting file %s.', path, Object.assign({ err }, lTags()));
                return remove(path);
            })
                .catch(innerErr => logger.error('Cannot remove file in youtubeDL error.', Object.assign({ innerErr }, lTags())));
            throw err;
        }
    }
    async guessVideoPathWithExtension(tmpPath, sourceExt) {
        if (!isVideoFileExtnameValid(sourceExt)) {
            throw new Error('Invalid video extension ' + sourceExt);
        }
        const extensions = [sourceExt, '.mp4', '.mkv', '.webm'];
        for (const extension of extensions) {
            const path = tmpPath + extension;
            if (await pathExists(path))
                return path;
        }
        const directoryContent = await readdir(dirname(tmpPath));
        throw new Error(`Cannot guess path of ${tmpPath}. Directory content: ${directoryContent.join(', ')}`);
    }
}
export { YoutubeDLWrapper };
//# sourceMappingURL=youtube-dl-wrapper.js.map