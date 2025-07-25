import { promisify2 } from '@peertube/peertube-core-utils';
import { sha1 } from '@peertube/peertube-node-utils';
import { WEBSERVER } from '../initializers/constants.js';
import { generateTorrentFileName } from '../lib/paths.js';
import { VideoPathManager } from '../lib/video-path-manager.js';
import bencode from 'bencode';
import createTorrent from 'create-torrent';
import { createWriteStream } from 'fs';
import { ensureDir, pathExists, remove } from 'fs-extra/esm';
import { readFile, writeFile } from 'fs/promises';
import { encode as magnetUriEncode } from 'magnet-uri';
import parseTorrent from 'parse-torrent';
import { dirname, join } from 'path';
import { pipeline } from 'stream';
import { CONFIG } from '../initializers/config.js';
import { logger } from './logger.js';
import { generateVideoImportTmpPath } from './utils.js';
import { extractVideo } from './video.js';
const createTorrentPromise = promisify2(createTorrent);
export async function downloadWebTorrentVideo(target, timeout) {
    const id = target.uri || target.torrentName;
    let timer;
    const path = generateVideoImportTmpPath(id);
    logger.info('Importing torrent video %s', id);
    const directoryPath = join(CONFIG.STORAGE.TMP_DIR, 'webtorrent');
    await ensureDir(directoryPath);
    const webtorrent = new (await import('webtorrent')).default({
        natUpnp: false,
        natPmp: false,
        utp: false,
        lsd: false,
        downloadLimit: 5000000,
        uploadLimit: 5000000
    });
    return new Promise((res, rej) => {
        let file;
        const torrentId = target.uri || join(CONFIG.STORAGE.TORRENTS_DIR, target.torrentName);
        const options = { path: directoryPath };
        const torrent = webtorrent.add(torrentId, options, torrent => {
            if (torrent.files.length !== 1) {
                if (timer)
                    clearTimeout(timer);
                for (const file of torrent.files) {
                    deleteDownloadedFile({ directoryPath, filepath: file.path });
                }
                return safeWebtorrentDestroy(webtorrent, torrentId, undefined, target.torrentName)
                    .then(() => rej(new Error('Cannot import torrent ' + torrentId + ': there are multiple files in it')));
            }
            logger.debug('Got torrent from webtorrent %s.', id, { infoHash: torrent.infoHash });
            file = torrent.files[0];
            const writeStream = createWriteStream(path);
            writeStream.on('finish', () => {
                if (timer)
                    clearTimeout(timer);
                safeWebtorrentDestroy(webtorrent, torrentId, { directoryPath, filepath: file.path }, target.torrentName)
                    .then(() => res(path))
                    .catch(err => logger.error('Cannot destroy webtorrent.', { err }));
            });
            pipeline(file.createReadStream(), writeStream, err => {
                if (err)
                    rej(err);
            });
        });
        torrent.on('error', err => rej(err));
        timer = setTimeout(() => {
            const err = new Error('Webtorrent download timeout.');
            safeWebtorrentDestroy(webtorrent, torrentId, file ? { directoryPath, filepath: file.path } : undefined, target.torrentName)
                .then(() => rej(err))
                .catch(destroyErr => {
                logger.error('Cannot destroy webtorrent.', { err: destroyErr });
                rej(err);
            });
        }, timeout);
    });
}
export function createTorrentAndSetInfoHash(videoOrPlaylist, videoFile) {
    return VideoPathManager.Instance.makeAvailableVideoFile(videoFile.withVideoOrPlaylist(videoOrPlaylist), videoPath => {
        return createTorrentAndSetInfoHashFromPath(videoOrPlaylist, videoFile, videoPath);
    });
}
export async function createTorrentAndSetInfoHashFromPath(videoOrPlaylist, videoFile, filePath) {
    const video = extractVideo(videoOrPlaylist);
    const options = {
        name: buildInfoName(video, videoFile),
        createdBy: 'PeerTube',
        announceList: buildAnnounceList(),
        urlList: buildUrlList(video, videoFile)
    };
    const torrentContent = await createTorrentPromise(filePath, options);
    const torrentFilename = generateTorrentFileName(videoOrPlaylist, videoFile.resolution);
    const torrentPath = join(CONFIG.STORAGE.TORRENTS_DIR, torrentFilename);
    logger.info('Creating torrent %s.', torrentPath);
    await writeFile(torrentPath, torrentContent);
    if (videoFile.hasTorrent()) {
        await remove(join(CONFIG.STORAGE.TORRENTS_DIR, videoFile.torrentFilename));
    }
    const parsedTorrent = await parseTorrent(torrentContent);
    videoFile.infoHash = parsedTorrent.infoHash;
    videoFile.torrentFilename = torrentFilename;
}
export async function updateTorrentMetadata(videoOrPlaylist, videoFile) {
    const video = extractVideo(videoOrPlaylist);
    if (!videoFile.torrentFilename) {
        logger.error(`Video file ${videoFile.filename} of video ${video.uuid} doesn't have a torrent file, skipping torrent metadata update`);
        return;
    }
    const oldTorrentPath = join(CONFIG.STORAGE.TORRENTS_DIR, videoFile.torrentFilename);
    if (!await pathExists(oldTorrentPath)) {
        logger.info('Do not update torrent metadata %s of video %s because the file does not exist anymore.', video.uuid, oldTorrentPath);
        return;
    }
    const torrentContent = await readFile(oldTorrentPath);
    const decoded = bencode.decode(torrentContent);
    decoded['announce-list'] = buildAnnounceList();
    decoded.announce = decoded['announce-list'][0][0];
    decoded['url-list'] = buildUrlList(video, videoFile);
    decoded.info.name = buildInfoName(video, videoFile);
    decoded['creation date'] = Math.ceil(Date.now() / 1000);
    const newTorrentFilename = generateTorrentFileName(videoOrPlaylist, videoFile.resolution);
    const newTorrentPath = join(CONFIG.STORAGE.TORRENTS_DIR, newTorrentFilename);
    logger.info('Updating torrent metadata %s -> %s.', oldTorrentPath, newTorrentPath);
    await writeFile(newTorrentPath, bencode.encode(decoded));
    await remove(oldTorrentPath);
    videoFile.torrentFilename = newTorrentFilename;
    videoFile.infoHash = sha1(bencode.encode(decoded.info));
}
export function generateMagnetUri(video, videoFile, trackerUrls) {
    const xs = videoFile.getTorrentUrl();
    const announce = trackerUrls;
    const urlList = video.hasPrivateStaticPath()
        ? []
        : [videoFile.getFileUrl(video)];
    const magnetHash = {
        xs,
        announce,
        urlList,
        infoHash: videoFile.infoHash,
        name: video.name
    };
    return magnetUriEncode(magnetHash);
}
function safeWebtorrentDestroy(webtorrent, torrentId, downloadedFile, torrentName) {
    return new Promise(res => {
        webtorrent.destroy(err => {
            if (torrentName) {
                logger.debug('Removing %s torrent after webtorrent download.', torrentId);
                remove(torrentId)
                    .catch(err => logger.error('Cannot remove torrent %s in webtorrent download.', torrentId, { err }));
            }
            if (downloadedFile)
                deleteDownloadedFile(downloadedFile);
            if (err)
                logger.warn('Cannot destroy webtorrent in timeout.', { err });
            return res();
        });
    });
}
function deleteDownloadedFile(downloadedFile) {
    let pathToDelete = dirname(downloadedFile.filepath);
    if (pathToDelete === '.')
        pathToDelete = downloadedFile.filepath;
    const toRemovePath = join(downloadedFile.directoryPath, pathToDelete);
    logger.debug('Removing %s after webtorrent download.', toRemovePath);
    remove(toRemovePath)
        .catch(err => logger.error('Cannot remove torrent file %s in webtorrent download.', toRemovePath, { err }));
}
function buildAnnounceList() {
    return [
        [WEBSERVER.WS + '://' + WEBSERVER.HOSTNAME + ':' + WEBSERVER.PORT + '/tracker/socket'],
        [WEBSERVER.URL + '/tracker/announce']
    ];
}
function buildUrlList(video, videoFile) {
    if (video.hasPrivateStaticPath())
        return [];
    return [videoFile.getFileUrl(video)];
}
function buildInfoName(video, videoFile) {
    const videoName = video.name.replace(/[/\\?%*:|"<>]/g, '-');
    return `${videoName} ${videoFile.resolution}p${videoFile.extname}`;
}
//# sourceMappingURL=webtorrent.js.map