import { wait } from '@peertube/peertube-core-utils';
import { FileStorage, LiveVideoError, VideoFileFormatFlag, VideoFileStream, VideoResolution, VideoStreamingPlaylistType } from '@peertube/peertube-models';
import { computeOutputFPS } from '../../../helpers/ffmpeg/index.js';
import { logger, loggerTagsFactory } from '../../../helpers/logger.js';
import { CONFIG } from '../../../initializers/config.js';
import { MEMOIZE_TTL, P2P_MEDIA_LOADER_PEER_VERSION, VIDEO_LIVE } from '../../../initializers/constants.js';
import { removeHLSFileObjectStorageByPath, storeHLSFileFromContent, storeHLSFileFromPath } from '../../object-storage/index.js';
import { VideoFileModel } from '../../../models/video/video-file.js';
import { VideoStreamingPlaylistModel } from '../../../models/video/video-streaming-playlist.js';
import Bluebird from 'bluebird';
import { watch } from 'chokidar';
import { EventEmitter } from 'events';
import { ensureDir } from 'fs-extra/esm';
import { appendFile, readFile, stat } from 'fs/promises';
import memoizee from 'memoizee';
import PQueue from 'p-queue';
import { basename, join } from 'path';
import { generateHLSMasterPlaylistFilename, generateHlsSha256SegmentsFilename, getLiveDirectory, getLiveReplayBaseDirectory } from '../../paths.js';
import { isUserQuotaValid } from '../../user.js';
import { LiveQuotaStore } from '../live-quota-store.js';
import { LiveSegmentShaStore } from '../live-segment-sha-store.js';
import { buildConcatenatedName, getLiveSegmentTime } from '../live-utils.js';
import { FFmpegTranscodingWrapper, RemoteTranscodingWrapper } from './transcoding-wrapper/index.js';
class MuxingSession extends EventEmitter {
    constructor(options) {
        super();
        this.objectStorageSendQueues = new Map();
        this.segmentsToProcessPerPlaylist = {};
        this.masterPlaylistCreated = false;
        this.liveReady = false;
        this.aborted = false;
        this.isAbleToUploadVideoWithCache = memoizee((userId) => {
            return isUserQuotaValid({ userId, uploadSize: 1000 });
        }, { maxAge: MEMOIZE_TTL.LIVE_ABLE_TO_UPLOAD });
        this.hasClientSocketInBadHealthWithCache = memoizee((sessionId) => {
            return this.hasClientSocketInBadHealth(sessionId);
        }, { maxAge: MEMOIZE_TTL.LIVE_CHECK_SOCKET_HEALTH });
        this.context = options.context;
        this.user = options.user;
        this.sessionId = options.sessionId;
        this.videoLive = options.videoLive;
        this.inputLocalUrl = options.inputLocalUrl;
        this.inputPublicUrl = options.inputPublicUrl;
        this.fps = options.fps;
        this.bitrate = options.bitrate;
        this.ratio = options.ratio;
        this.probe = options.probe;
        this.hasVideo = options.hasVideo;
        this.hasAudio = options.hasAudio;
        this.inputResolution = options.inputResolution;
        this.allResolutions = options.allResolutions;
        this.videoUUID = this.videoLive.Video.uuid;
        this.saveReplay = this.videoLive.saveReplay;
        this.outDirectory = getLiveDirectory(this.videoLive.Video);
        this.replayDirectory = join(getLiveReplayBaseDirectory(this.videoLive.Video), new Date().toISOString());
        this.lTags = loggerTagsFactory('live', this.sessionId, this.videoUUID);
    }
    async runMuxing() {
        this.streamingPlaylist = await this.createLivePlaylist();
        const toTranscode = this.buildToTranscode();
        this.createLiveShaStore();
        this.createFiles(toTranscode);
        await this.prepareDirectories();
        this.transcodingWrapper = this.buildTranscodingWrapper(toTranscode);
        this.transcodingWrapper.on('end', () => this.onTranscodedEnded());
        this.transcodingWrapper.on('error', () => this.onTranscodingError());
        await this.transcodingWrapper.run();
        this.filesWatcher = watch(this.outDirectory, { depth: 0 });
        this.watchMasterFile();
        this.watchTSFiles();
    }
    abort() {
        if (!this.transcodingWrapper)
            return;
        this.aborted = true;
        this.transcodingWrapper.abort();
    }
    destroy() {
        this.removeAllListeners();
        this.isAbleToUploadVideoWithCache.clear();
        this.hasClientSocketInBadHealthWithCache.clear();
    }
    watchMasterFile() {
        this.filesWatcher.on('add', async (path) => {
            if (path !== join(this.outDirectory, this.streamingPlaylist.playlistFilename))
                return;
            if (this.masterPlaylistCreated === true)
                return;
            try {
                if (this.streamingPlaylist.storage === FileStorage.OBJECT_STORAGE) {
                    let masterContent = await readFile(path, 'utf-8');
                    while (!masterContent) {
                        await wait(100);
                        masterContent = await readFile(path, 'utf-8');
                    }
                    logger.debug('Uploading live master playlist on object storage for %s', this.videoUUID, Object.assign({ masterContent }, this.lTags()));
                    const url = await storeHLSFileFromContent({
                        playlist: this.streamingPlaylist,
                        pathOrFilename: this.streamingPlaylist.playlistFilename,
                        content: masterContent
                    });
                    this.streamingPlaylist.playlistUrl = url;
                }
                this.streamingPlaylist.assignP2PMediaLoaderInfoHashes(this.videoLive.Video, this.allResolutions.map(r => ({ height: r })));
                await this.streamingPlaylist.save();
            }
            catch (err) {
                logger.error('Cannot update streaming playlist.', Object.assign({ err }, this.lTags()));
            }
            this.masterPlaylistCreated = true;
            logger.info('Master playlist file for %s has been created', this.videoUUID, this.lTags());
        });
    }
    watchTSFiles() {
        const startStreamDateTime = new Date().getTime();
        const addHandler = async (segmentPath) => {
            if (segmentPath.endsWith('.ts') !== true)
                return;
            logger.debug('Live add handler of TS file %s.', segmentPath, this.lTags());
            const playlistId = this.getPlaylistIdFromTS(segmentPath);
            const segmentsToProcess = this.segmentsToProcessPerPlaylist[playlistId] || [];
            this.processSegments(segmentsToProcess);
            this.segmentsToProcessPerPlaylist[playlistId] = [segmentPath];
            if (this.hasClientSocketInBadHealthWithCache(this.sessionId)) {
                this.emit('bad-socket-health', { videoUUID: this.videoUUID });
                return;
            }
            if (this.isDurationConstraintValid(startStreamDateTime) !== true) {
                this.emit('duration-exceeded', { videoUUID: this.videoUUID });
                return;
            }
            if (await this.isQuotaExceeded(segmentPath) === true) {
                this.emit('quota-exceeded', { videoUUID: this.videoUUID });
            }
        };
        const deleteHandler = async (segmentPath) => {
            if (segmentPath.endsWith('.ts') !== true)
                return;
            logger.debug('Live delete handler of TS file %s.', segmentPath, this.lTags());
            try {
                await this.liveSegmentShaStore.removeSegmentSha(segmentPath);
            }
            catch (err) {
                logger.warn('Cannot remove segment sha %s from sha store', segmentPath, Object.assign({ err }, this.lTags()));
            }
            if (this.streamingPlaylist.storage === FileStorage.OBJECT_STORAGE) {
                try {
                    await removeHLSFileObjectStorageByPath(this.streamingPlaylist, segmentPath);
                }
                catch (err) {
                    logger.error('Cannot remove segment %s from object storage', segmentPath, Object.assign({ err }, this.lTags()));
                }
            }
        };
        this.filesWatcher.on('add', p => addHandler(p));
        this.filesWatcher.on('unlink', p => deleteHandler(p));
    }
    async isQuotaExceeded(segmentPath) {
        if (this.saveReplay !== true)
            return false;
        if (this.aborted)
            return false;
        try {
            const segmentStat = await stat(segmentPath);
            LiveQuotaStore.Instance.addQuotaTo(this.user.id, this.sessionId, segmentStat.size);
            const canUpload = await this.isAbleToUploadVideoWithCache(this.user.id);
            return canUpload !== true;
        }
        catch (err) {
            logger.error('Cannot stat %s or check quota of %d.', segmentPath, this.user.id, Object.assign({ err }, this.lTags()));
        }
    }
    createFiles(toTranscode) {
        for (const { resolution, fps } of toTranscode) {
            const file = new VideoFileModel({
                resolution,
                fps,
                size: -1,
                extname: '.ts',
                infoHash: null,
                formatFlags: VideoFileFormatFlag.NONE,
                streams: resolution === VideoResolution.H_NOVIDEO
                    ? VideoFileStream.AUDIO
                    : VideoFileStream.VIDEO,
                storage: this.streamingPlaylist.storage,
                videoStreamingPlaylistId: this.streamingPlaylist.id
            });
            VideoFileModel.customUpsert(file, 'streaming-playlist', null)
                .catch(err => logger.error('Cannot create file for live streaming.', Object.assign({ err }, this.lTags())));
        }
    }
    async prepareDirectories() {
        await ensureDir(this.outDirectory);
        if (this.videoLive.saveReplay === true) {
            await ensureDir(this.replayDirectory);
        }
    }
    isDurationConstraintValid(streamingStartTime) {
        const maxDuration = CONFIG.LIVE.MAX_DURATION;
        if (maxDuration < 0)
            return true;
        const now = new Date().getTime();
        const max = streamingStartTime + maxDuration;
        return now <= max;
    }
    processSegments(segmentPaths) {
        Bluebird.mapSeries(segmentPaths, previousSegment => this.processSegment(previousSegment))
            .catch(err => {
            if (this.aborted)
                return;
            logger.error('Cannot process segments', Object.assign({ err }, this.lTags()));
        });
    }
    async processSegment(segmentPath) {
        await this.liveSegmentShaStore.addSegmentSha(segmentPath);
        if (this.saveReplay) {
            await this.addSegmentToReplay(segmentPath);
        }
        if (this.streamingPlaylist.storage === FileStorage.OBJECT_STORAGE) {
            try {
                await storeHLSFileFromPath(this.streamingPlaylist, segmentPath);
                await this.processM3U8ToObjectStorage(segmentPath);
            }
            catch (err) {
                logger.error('Cannot store TS segment %s in object storage', segmentPath, Object.assign({ err }, this.lTags()));
            }
        }
        if (this.masterPlaylistCreated && !this.liveReady) {
            this.liveReady = true;
            this.emit('live-ready', { videoUUID: this.videoUUID });
        }
    }
    async processM3U8ToObjectStorage(segmentPath) {
        const m3u8Path = join(this.outDirectory, this.getPlaylistNameFromTS(segmentPath));
        logger.debug('Process M3U8 file %s.', m3u8Path, this.lTags());
        const segmentName = basename(segmentPath);
        const playlistContent = await readFile(m3u8Path, 'utf-8');
        const filteredPlaylistContent = playlistContent.substring(0, playlistContent.lastIndexOf(segmentName) + segmentName.length) + '\n';
        try {
            if (!this.objectStorageSendQueues.has(m3u8Path)) {
                this.objectStorageSendQueues.set(m3u8Path, new PQueue({ concurrency: 1 }));
            }
            const queue = this.objectStorageSendQueues.get(m3u8Path);
            await queue.add(() => storeHLSFileFromContent({
                playlist: this.streamingPlaylist,
                pathOrFilename: m3u8Path,
                content: filteredPlaylistContent
            }));
        }
        catch (err) {
            logger.error('Cannot store in object storage m3u8 file %s', m3u8Path, Object.assign({ err }, this.lTags()));
        }
    }
    onTranscodingError() {
        this.emit('transcoding-error', { videoUUID: this.videoUUID });
    }
    onTranscodedEnded() {
        this.emit('transcoding-end', { videoUUID: this.videoUUID });
        logger.info('RTMP transmuxing for video %s ended. Scheduling cleanup', this.inputLocalUrl, this.lTags());
        setTimeout(() => {
            var _a;
            const promise = ((_a = this.filesWatcher) === null || _a === void 0 ? void 0 : _a.close()) || Promise.resolve();
            promise
                .then(() => {
                for (const key of Object.keys(this.segmentsToProcessPerPlaylist)) {
                    this.processSegments(this.segmentsToProcessPerPlaylist[key]);
                }
            })
                .catch(err => {
                logger.error('Cannot close watchers of %s or process remaining hash segments.', this.outDirectory, Object.assign({ err }, this.lTags()));
            });
            this.emit('after-cleanup', { videoUUID: this.videoUUID });
        }, 1000);
    }
    hasClientSocketInBadHealth(sessionId) {
        const rtmpSession = this.context.sessions.get(sessionId);
        if (!rtmpSession) {
            logger.warn('Cannot get session %s to check players socket health.', sessionId, this.lTags());
            return;
        }
        for (const playerSessionId of rtmpSession.players) {
            const playerSession = this.context.sessions.get(playerSessionId);
            if (!playerSession) {
                logger.error('Cannot get player session %s to check socket health.', playerSession, this.lTags());
                continue;
            }
            if (playerSession.socket.writableLength > VIDEO_LIVE.MAX_SOCKET_WAITING_DATA) {
                return true;
            }
        }
        return false;
    }
    async addSegmentToReplay(segmentPath) {
        const segmentName = basename(segmentPath);
        const dest = join(this.replayDirectory, buildConcatenatedName(segmentName));
        logger.debug(`Add segment ${segmentPath} to replay ${dest}`, this.lTags());
        try {
            const data = await readFile(segmentPath);
            await appendFile(dest, data);
        }
        catch (err) {
            logger.error('Cannot copy segment %s to replay directory.', segmentPath, Object.assign({ err }, this.lTags()));
        }
    }
    async createLivePlaylist() {
        const { playlist } = await VideoStreamingPlaylistModel.loadOrGenerate(this.videoLive.Video);
        playlist.playlistFilename = generateHLSMasterPlaylistFilename(true);
        playlist.segmentsSha256Filename = generateHlsSha256SegmentsFilename(true);
        playlist.p2pMediaLoaderPeerVersion = P2P_MEDIA_LOADER_PEER_VERSION;
        playlist.type = VideoStreamingPlaylistType.HLS;
        playlist.storage = CONFIG.OBJECT_STORAGE.ENABLED && CONFIG.OBJECT_STORAGE.STREAMING_PLAYLISTS.STORE_LIVE_STREAMS
            ? FileStorage.OBJECT_STORAGE
            : FileStorage.FILE_SYSTEM;
        return playlist.save();
    }
    createLiveShaStore() {
        this.liveSegmentShaStore = new LiveSegmentShaStore({
            videoUUID: this.videoLive.Video.uuid,
            sha256Path: join(this.outDirectory, this.streamingPlaylist.segmentsSha256Filename),
            streamingPlaylist: this.streamingPlaylist,
            sendToObjectStorage: this.streamingPlaylist.storage === FileStorage.OBJECT_STORAGE
        });
    }
    buildTranscodingWrapper(toTranscode) {
        const options = {
            streamingPlaylist: this.streamingPlaylist,
            videoLive: this.videoLive,
            lTags: this.lTags,
            sessionId: this.sessionId,
            inputLocalUrl: this.inputLocalUrl,
            inputPublicUrl: this.inputPublicUrl,
            toTranscode,
            bitrate: this.bitrate,
            ratio: this.ratio,
            hasAudio: this.hasAudio,
            hasVideo: this.hasVideo,
            probe: this.probe,
            segmentListSize: VIDEO_LIVE.SEGMENTS_LIST_SIZE,
            segmentDuration: getLiveSegmentTime(this.videoLive.latencyMode),
            outDirectory: this.outDirectory
        };
        return CONFIG.LIVE.TRANSCODING.ENABLED && CONFIG.LIVE.TRANSCODING.REMOTE_RUNNERS.ENABLED
            ? new RemoteTranscodingWrapper(options)
            : new FFmpegTranscodingWrapper(options);
    }
    getPlaylistIdFromTS(segmentPath) {
        const playlistIdMatcher = /^([\d+])-/;
        return basename(segmentPath).match(playlistIdMatcher)[1];
    }
    getPlaylistNameFromTS(segmentPath) {
        return `${this.getPlaylistIdFromTS(segmentPath)}.m3u8`;
    }
    buildToTranscode() {
        return this.allResolutions.map(resolution => {
            let toTranscodeFPS;
            if (resolution === VideoResolution.H_NOVIDEO) {
                return { resolution, fps: 0 };
            }
            try {
                toTranscodeFPS = computeOutputFPS({
                    inputFPS: this.fps,
                    resolution,
                    isOriginResolution: resolution === this.inputResolution,
                    type: 'live'
                });
            }
            catch (err) {
                err.liveVideoErrorCode = LiveVideoError.INVALID_INPUT_VIDEO_STREAM;
                throw err;
            }
            return { resolution, fps: toTranscodeFPS };
        });
    }
}
export { MuxingSession };
//# sourceMappingURL=muxing-session.js.map