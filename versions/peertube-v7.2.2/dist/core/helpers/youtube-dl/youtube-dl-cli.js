import { randomInt } from '@peertube/peertube-core-utils';
import { VideoResolution } from '@peertube/peertube-models';
import { CONFIG } from '../../initializers/config.js';
import { execa } from 'execa';
import { ensureDir, pathExists } from 'fs-extra/esm';
import { chmod, writeFile } from 'fs/promises';
import { dirname, join } from 'path';
import { logger, loggerTagsFactory } from '../logger.js';
import { getProxy, isProxyEnabled } from '../proxy.js';
import { isBinaryResponse, unsafeSSRFGot } from '../requests.js';
const lTags = loggerTagsFactory('youtube-dl');
const youtubeDLBinaryPath = join(CONFIG.STORAGE.BIN_DIR, CONFIG.IMPORT.VIDEOS.HTTP.YOUTUBE_DL_RELEASE.NAME);
export class YoutubeDLCLI {
    static async safeGet() {
        if (!await pathExists(youtubeDLBinaryPath)) {
            await ensureDir(dirname(youtubeDLBinaryPath));
            await this.updateYoutubeDLBinary();
        }
        return new YoutubeDLCLI();
    }
    static async updateYoutubeDLBinary() {
        const url = CONFIG.IMPORT.VIDEOS.HTTP.YOUTUBE_DL_RELEASE.URL;
        logger.info('Updating youtubeDL binary from %s.', url, lTags());
        const gotOptions = {
            context: { bodyKBLimit: 100000 },
            responseType: 'buffer'
        };
        if (process.env.YOUTUBE_DL_DOWNLOAD_BEARER_TOKEN) {
            gotOptions.headers = {
                authorization: 'Bearer ' + process.env.YOUTUBE_DL_DOWNLOAD_BEARER_TOKEN
            };
        }
        try {
            let gotResult = await unsafeSSRFGot(url, gotOptions);
            if (!isBinaryResponse(gotResult)) {
                const json = JSON.parse(gotResult.body.toString());
                const latest = json.filter(release => release.prerelease === false)[0];
                if (!latest)
                    throw new Error('Cannot find latest release');
                const releaseName = CONFIG.IMPORT.VIDEOS.HTTP.YOUTUBE_DL_RELEASE.NAME;
                const releaseAsset = latest.assets.find(a => a.name === releaseName);
                if (!releaseAsset)
                    throw new Error(`Cannot find appropriate release with name ${releaseName} in release assets`);
                gotResult = await unsafeSSRFGot(releaseAsset.browser_download_url, gotOptions);
            }
            if (!isBinaryResponse(gotResult)) {
                throw new Error('Not a binary response');
            }
            await writeFile(youtubeDLBinaryPath, gotResult.body);
            if (!CONFIG.IMPORT.VIDEOS.HTTP.YOUTUBE_DL_RELEASE.PYTHON_PATH) {
                await chmod(youtubeDLBinaryPath, '744');
            }
            logger.info('youtube-dl updated %s.', youtubeDLBinaryPath, lTags());
        }
        catch (err) {
            logger.error('Cannot update youtube-dl from %s.', url, Object.assign({ err }, lTags()));
        }
    }
    static getYoutubeDLVideoFormat(enabledResolutions, useBestFormat) {
        let result = [];
        if (!useBestFormat) {
            const resolution = enabledResolutions.length === 0
                ? VideoResolution.H_720P
                : Math.max(...enabledResolutions);
            result = [
                `bestvideo[vcodec^=avc1][height=${resolution}]+bestaudio[ext=m4a]`,
                `bestvideo[vcodec!*=av01][vcodec!*=vp9.2][height=${resolution}]+bestaudio`,
                `bestvideo[vcodec^=avc1][height<=${resolution}]+bestaudio[ext=m4a]`
            ];
        }
        return result.concat([
            'bestvideo[vcodec!*=av01][vcodec!*=vp9.2]+bestaudio',
            'best[vcodec!*=av01][vcodec!*=vp9.2]',
            'bestvideo[ext=mp4]+bestaudio[ext=m4a]',
            'best'
        ]).join('/');
    }
    constructor() {
    }
    download(options) {
        let args = options.additionalYoutubeDLArgs || [];
        args = args.concat(['--merge-output-format', 'mp4', '-f', options.format, '-o', options.output]);
        return this.run({
            url: options.url,
            processOptions: options.processOptions,
            timeout: options.timeout,
            args
        });
    }
    async getInfo(options) {
        const { url, format, additionalYoutubeDLArgs = [], processOptions } = options;
        const completeArgs = additionalYoutubeDLArgs.concat(['--dump-json', '-f', format]);
        const data = await this.run({ url, args: completeArgs, processOptions });
        if (!data)
            return undefined;
        const info = data.map(d => JSON.parse(d));
        return info.length === 1
            ? info[0]
            : info;
    }
    async getListInfo(options) {
        const additionalYoutubeDLArgs = ['--skip-download', '--playlist-reverse'];
        if (CONFIG.IMPORT.VIDEOS.HTTP.YOUTUBE_DL_RELEASE.NAME === 'yt-dlp') {
            additionalYoutubeDLArgs.push('--flat-playlist');
        }
        if (options.latestVideosCount !== undefined) {
            additionalYoutubeDLArgs.push('--playlist-end', options.latestVideosCount.toString());
        }
        const result = await this.getInfo({
            url: options.url,
            format: YoutubeDLCLI.getYoutubeDLVideoFormat([], false),
            processOptions: options.processOptions,
            additionalYoutubeDLArgs
        });
        if (!result)
            return result;
        if (!Array.isArray(result))
            return [result];
        return result;
    }
    async getSubs(options) {
        const { url, format, processOptions } = options;
        const args = ['--skip-download', '--all-subs', `--sub-format=${format}`];
        const data = await this.run({ url, args, processOptions });
        const files = [];
        const skipString = '[info] Writing video subtitles to: ';
        for (let i = 0, len = data.length; i < len; i++) {
            const line = data[i];
            if (line.startsWith(skipString)) {
                files.push(line.slice(skipString.length));
            }
        }
        return files;
    }
    async run(options) {
        const { url, args, timeout, processOptions } = options;
        let completeArgs = this.wrapWithProxyOptions(args);
        completeArgs = this.wrapWithIPOptions(completeArgs);
        completeArgs = this.wrapWithFFmpegOptions(completeArgs);
        const subProcessBinary = CONFIG.IMPORT.VIDEOS.HTTP.YOUTUBE_DL_RELEASE.PYTHON_PATH || youtubeDLBinaryPath;
        const subProcessArgs = [...completeArgs, url];
        if (subProcessBinary !== youtubeDLBinaryPath)
            subProcessArgs.unshift(youtubeDLBinaryPath);
        const subProcess = execa(subProcessBinary, subProcessArgs, processOptions);
        if (timeout) {
            setTimeout(() => subProcess.kill(), timeout);
        }
        const output = await subProcess;
        logger.debug('Run youtube-dl command.', Object.assign({ command: output.command }, lTags()));
        return output.stdout
            ? output.stdout.trim().split(/\r?\n/)
            : undefined;
    }
    wrapWithProxyOptions(args) {
        const config = CONFIG.IMPORT.VIDEOS.HTTP.PROXIES;
        const configProxyEnabled = Array.isArray(config) && config.length !== 0;
        if (configProxyEnabled || isProxyEnabled()) {
            const proxy = configProxyEnabled
                ? config[randomInt(0, config.length)]
                : getProxy();
            logger.debug('Using proxy %s for YoutubeDL', proxy, lTags());
            return ['--proxy', proxy].concat(args);
        }
        return args;
    }
    wrapWithIPOptions(args) {
        if (CONFIG.IMPORT.VIDEOS.HTTP.FORCE_IPV4) {
            logger.debug('Force ipv4 for YoutubeDL');
            return ['--force-ipv4'].concat(args);
        }
        return args;
    }
    wrapWithFFmpegOptions(args) {
        if (process.env.FFMPEG_PATH) {
            logger.debug('Using ffmpeg location %s for YoutubeDL', process.env.FFMPEG_PATH, lTags());
            return ['--ffmpeg-location', process.env.FFMPEG_PATH].concat(args);
        }
        return args;
    }
}
//# sourceMappingURL=youtube-dl-cli.js.map