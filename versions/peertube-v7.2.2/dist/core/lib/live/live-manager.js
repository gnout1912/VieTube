import { pick, wait } from '@peertube/peertube-core-utils';
import { ffprobePromise, getVideoStreamBitrate, getVideoStreamDimensionsInfo, getVideoStreamFPS, hasAudioStream, hasVideoStream } from '@peertube/peertube-ffmpeg';
import { LiveVideoError, VideoResolution, VideoState } from '@peertube/peertube-models';
import { retryTransactionWrapper } from '../../helpers/database-utils.js';
import { logger, loggerTagsFactory } from '../../helpers/logger.js';
import { CONFIG, registerConfigChangedHandler } from '../../initializers/config.js';
import { VIDEO_LIVE, WEBSERVER } from '../../initializers/constants.js';
import { sequelizeTypescript } from '../../initializers/database.js';
import { RunnerJobModel } from '../../models/runner/runner-job.js';
import { UserModel } from '../../models/user/user.js';
import { VideoLiveReplaySettingModel } from '../../models/video/video-live-replay-setting.js';
import { VideoLiveSessionModel } from '../../models/video/video-live-session.js';
import { VideoLiveModel } from '../../models/video/video-live.js';
import { VideoStreamingPlaylistModel } from '../../models/video/video-streaming-playlist.js';
import { VideoModel } from '../../models/video/video.js';
import { readFile, readdir } from 'fs/promises';
import { createServer } from 'net';
import context from 'node-media-server/src/node_core_ctx.js';
import nodeMediaServerLogger from 'node-media-server/src/node_core_logger.js';
import NodeRtmpSession from 'node-media-server/src/node_rtmp_session.js';
import { createServer as createServerTLS } from 'tls';
import { federateVideoIfNeeded } from '../activitypub/videos/index.js';
import { JobQueue } from '../job-queue/index.js';
import { Notifier } from '../notifier/notifier.js';
import { getLiveReplayBaseDirectory } from '../paths.js';
import { PeerTubeSocket } from '../peertube-socket.js';
import { Hooks } from '../plugins/hooks.js';
import { computeResolutionsToTranscode } from '../transcoding/transcoding-resolutions.js';
import { LiveQuotaStore } from './live-quota-store.js';
import { cleanupAndDestroyPermanentLive, getLiveSegmentTime } from './live-utils.js';
import { MuxingSession } from './shared/index.js';
nodeMediaServerLogger.setLogType(0);
const config = {
    rtmp: {
        port: CONFIG.LIVE.RTMP.PORT,
        chunk_size: VIDEO_LIVE.RTMP.CHUNK_SIZE,
        gop_cache: VIDEO_LIVE.RTMP.GOP_CACHE,
        ping: VIDEO_LIVE.RTMP.PING,
        ping_timeout: VIDEO_LIVE.RTMP.PING_TIMEOUT
    }
};
const lTags = loggerTagsFactory('live');
class LiveManager {
    constructor() {
        this.muxingSessions = new Map();
        this.videoSessions = new Map();
        this.running = false;
    }
    init() {
        const events = this.getContext().nodeEvent;
        events.on('postPublish', (sessionId, streamPath) => {
            logger.debug('RTMP received stream', Object.assign({ id: sessionId, streamPath }, lTags(sessionId)));
            const splittedPath = streamPath.split('/');
            if (splittedPath.length !== 3 || splittedPath[1] !== VIDEO_LIVE.RTMP.BASE_PATH) {
                logger.warn('Live path is incorrect.', Object.assign({ streamPath }, lTags(sessionId)));
                return this.abortSession(sessionId);
            }
            const session = this.getContext().sessions.get(sessionId);
            const inputLocalUrl = session.inputOriginLocalUrl + streamPath;
            const inputPublicUrl = session.inputOriginPublicUrl + streamPath;
            this.handleSession({ sessionId, inputPublicUrl, inputLocalUrl, streamKey: splittedPath[2] })
                .catch(err => logger.error('Cannot handle session', Object.assign({ err }, lTags(sessionId))));
        });
        events.on('donePublish', (sessionId) => {
            logger.info('Live session ended.', Object.assign({ sessionId }, lTags(sessionId)));
            setTimeout(() => this.abortSession(sessionId), 2000);
        });
        registerConfigChangedHandler(() => {
            if (!this.running && CONFIG.LIVE.ENABLED === true) {
                this.run().catch(err => logger.error('Cannot run live server.', { err }));
                return;
            }
            if (this.running && CONFIG.LIVE.ENABLED === false) {
                this.stop();
            }
        });
        this.handleBrokenLives()
            .catch(err => logger.error('Cannot handle broken lives.', Object.assign({ err }, lTags())));
    }
    async run() {
        this.running = true;
        if (CONFIG.LIVE.RTMP.ENABLED) {
            logger.info('Running RTMP server on port %d', CONFIG.LIVE.RTMP.PORT, lTags());
            this.rtmpServer = createServer(socket => {
                const session = new NodeRtmpSession(config, socket);
                session.inputOriginLocalUrl = 'rtmp://127.0.0.1:' + CONFIG.LIVE.RTMP.PORT;
                session.inputOriginPublicUrl = WEBSERVER.RTMP_URL;
                session.run();
            });
            this.rtmpServer.on('error', err => {
                logger.error('Cannot run RTMP server.', Object.assign({ err }, lTags()));
            });
            this.rtmpServer.listen(CONFIG.LIVE.RTMP.PORT, CONFIG.LIVE.RTMP.HOSTNAME);
        }
        if (CONFIG.LIVE.RTMPS.ENABLED) {
            logger.info('Running RTMPS server on port %d', CONFIG.LIVE.RTMPS.PORT, lTags());
            const [key, cert] = await Promise.all([
                readFile(CONFIG.LIVE.RTMPS.KEY_FILE),
                readFile(CONFIG.LIVE.RTMPS.CERT_FILE)
            ]);
            const serverOptions = { key, cert };
            this.rtmpsServer = createServerTLS(serverOptions, socket => {
                const session = new NodeRtmpSession(config, socket);
                session.inputOriginLocalUrl = 'rtmps://127.0.0.1:' + CONFIG.LIVE.RTMPS.PORT;
                session.inputOriginPublicUrl = WEBSERVER.RTMPS_URL;
                session.run();
            });
            this.rtmpsServer.on('error', err => {
                logger.error('Cannot run RTMPS server.', Object.assign({ err }, lTags()));
            });
            this.rtmpsServer.listen(CONFIG.LIVE.RTMPS.PORT, CONFIG.LIVE.RTMPS.HOSTNAME);
        }
    }
    stop() {
        this.running = false;
        if (this.rtmpServer) {
            logger.info('Stopping RTMP server.', lTags());
            this.rtmpServer.close();
            this.rtmpServer = undefined;
        }
        if (this.rtmpsServer) {
            logger.info('Stopping RTMPS server.', lTags());
            this.rtmpsServer.close();
            this.rtmpsServer = undefined;
        }
        this.getContext().sessions.forEach((session) => {
            if (session instanceof NodeRtmpSession) {
                session.stop();
            }
        });
    }
    isRunning() {
        return !!this.rtmpServer;
    }
    hasSession(sessionId) {
        return this.getContext().sessions.has(sessionId);
    }
    stopSessionOfVideo(options) {
        const { videoUUID, expectedSessionId, error } = options;
        const sessionId = this.videoSessions.get(videoUUID);
        if (!sessionId) {
            logger.debug('No live session to stop for video %s', videoUUID, lTags(sessionId, videoUUID));
            return;
        }
        if (expectedSessionId && expectedSessionId !== sessionId) {
            logger.debug(`No live session ${expectedSessionId} to stop for video ${videoUUID} (current session: ${sessionId})`, lTags(sessionId, videoUUID));
            return;
        }
        logger.info('Stopping live session of video %s', videoUUID, Object.assign({ error }, lTags(sessionId, videoUUID)));
        this.saveEndingSession(options)
            .catch(err => logger.error('Cannot save ending session.', Object.assign({ err }, lTags(sessionId, videoUUID))));
        this.videoSessions.delete(videoUUID);
        this.abortSession(sessionId);
    }
    getContext() {
        return context;
    }
    abortSession(sessionId) {
        const session = this.getContext().sessions.get(sessionId);
        if (session) {
            session.stop();
            this.getContext().sessions.delete(sessionId);
        }
        const muxingSession = this.muxingSessions.get(sessionId);
        if (muxingSession) {
            muxingSession.abort();
            this.muxingSessions.delete(sessionId);
        }
    }
    async handleSession(options) {
        const { inputLocalUrl, inputPublicUrl, sessionId, streamKey } = options;
        logger.debug(`Handling session ${sessionId}`, lTags(sessionId));
        const videoLive = await VideoLiveModel.loadByStreamKey(streamKey);
        if (!videoLive) {
            logger.warn('Unknown live video with stream key %s.', streamKey, lTags(sessionId));
            return this.abortSession(sessionId);
        }
        const video = videoLive.Video;
        if (video.isBlacklisted()) {
            logger.warn('Video is blacklisted. Refusing stream %s.', streamKey, lTags(sessionId, video.uuid));
            return this.abortSession(sessionId);
        }
        const user = await UserModel.loadByLiveId(videoLive.id);
        if (user.blocked) {
            logger.warn('User is blocked. Refusing stream %s.', streamKey, lTags(sessionId, video.uuid));
            return this.abortSession(sessionId);
        }
        if (this.videoSessions.has(video.uuid)) {
            logger.warn('Video %s has already a live session %s. Refusing stream %s.', video.uuid, this.videoSessions.get(video.uuid), streamKey, lTags(sessionId, video.uuid));
            return this.abortSession(sessionId);
        }
        const oldStreamingPlaylist = await VideoStreamingPlaylistModel.loadHLSByVideo(video.id);
        if (oldStreamingPlaylist) {
            if (!videoLive.permanentLive)
                throw new Error('Found previous session in a non permanent live: ' + video.uuid);
            PeerTubeSocket.Instance.sendVideoForceEnd(video);
            await cleanupAndDestroyPermanentLive(video, oldStreamingPlaylist);
        }
        this.videoSessions.set(video.uuid, sessionId);
        logger.debug('Probing ' + inputLocalUrl, lTags(sessionId, video.uuid));
        const now = Date.now();
        let probe;
        try {
            probe = await ffprobePromise(inputLocalUrl);
        }
        catch (err) {
            logger.error('Cannot probe ' + inputLocalUrl, Object.assign({ err }, lTags(sessionId, video.uuid)));
            this.videoSessions.delete(video.uuid);
            return this.abortSession(sessionId);
        }
        const [{ resolution, ratio }, fps, bitrate, hasAudio, hasVideo] = await Promise.all([
            getVideoStreamDimensionsInfo(inputLocalUrl, probe),
            getVideoStreamFPS(inputLocalUrl, probe),
            getVideoStreamBitrate(inputLocalUrl, probe),
            hasAudioStream(inputLocalUrl, probe),
            hasVideoStream(inputLocalUrl, probe)
        ]);
        if (!hasAudio && !hasVideo) {
            logger.warn('Not audio and video streams were found for video %s. Refusing stream %s.', video.uuid, streamKey, lTags(sessionId, video.uuid));
            this.videoSessions.delete(video.uuid);
            return this.abortSession(sessionId);
        }
        logger.info('%s probing took %d ms (bitrate: %d, fps: %d, resolution: %d)', inputLocalUrl, Date.now() - now, bitrate, fps, resolution, lTags(sessionId, video.uuid));
        const allResolutions = await Hooks.wrapObject(this.buildAllResolutionsToTranscode(resolution, hasAudio), 'filter:transcoding.auto.resolutions-to-transcode.result', { video });
        if (!hasAudio && allResolutions.length === 1 && allResolutions[0] === VideoResolution.H_NOVIDEO) {
            logger.warn('Cannot stream live to audio only because no video stream is available for video %s. Refusing stream %s.', video.uuid, streamKey, lTags(sessionId, video.uuid));
            this.videoSessions.delete(video.uuid);
            return this.abortSession(sessionId);
        }
        logger.info('Handling live video of original resolution %d.', resolution, Object.assign({ allResolutions }, lTags(sessionId, video.uuid)));
        return this.runMuxingSession({
            sessionId,
            videoLive,
            user,
            inputLocalUrl,
            inputPublicUrl,
            fps,
            bitrate,
            ratio,
            inputResolution: resolution,
            allResolutions,
            hasAudio,
            hasVideo,
            probe
        });
    }
    async runMuxingSession(options) {
        const { sessionId, videoLive, user, ratio, allResolutions } = options;
        const videoUUID = videoLive.Video.uuid;
        const localLTags = lTags(sessionId, videoUUID);
        const audioOnlyOutput = allResolutions.every(r => r === VideoResolution.H_NOVIDEO);
        const liveSession = await this.saveStartingSession(videoLive);
        LiveQuotaStore.Instance.addNewLive(user.id, sessionId);
        const muxingSession = new MuxingSession(Object.assign({ context: this.getContext(), sessionId,
            videoLive,
            user }, pick(options, [
            'inputLocalUrl',
            'inputPublicUrl',
            'inputResolution',
            'bitrate',
            'ratio',
            'fps',
            'allResolutions',
            'hasAudio',
            'hasVideo',
            'probe'
        ])));
        muxingSession.on('live-ready', () => this.publishAndFederateLive({ live: videoLive, ratio, audioOnlyOutput, localLTags }));
        muxingSession.on('bad-socket-health', ({ videoUUID }) => {
            logger.error('Too much data in client socket stream (ffmpeg is too slow to transcode the video).' +
                ' Stopping session of video %s.', videoUUID, localLTags);
            this.stopSessionOfVideo({ videoUUID, error: LiveVideoError.BAD_SOCKET_HEALTH });
        });
        muxingSession.on('duration-exceeded', ({ videoUUID }) => {
            logger.info('Stopping session of %s: max duration exceeded.', videoUUID, localLTags);
            this.stopSessionOfVideo({ videoUUID, error: LiveVideoError.DURATION_EXCEEDED });
        });
        muxingSession.on('quota-exceeded', ({ videoUUID }) => {
            logger.info('Stopping session of %s: user quota exceeded.', videoUUID, localLTags);
            this.stopSessionOfVideo({ videoUUID, error: LiveVideoError.QUOTA_EXCEEDED });
        });
        muxingSession.on('transcoding-error', ({ videoUUID }) => {
            this.stopSessionOfVideo({ videoUUID, error: LiveVideoError.FFMPEG_ERROR });
        });
        muxingSession.on('transcoding-end', ({ videoUUID }) => {
            this.onMuxingFFmpegEnd(videoUUID, sessionId);
        });
        muxingSession.on('after-cleanup', ({ videoUUID }) => {
            this.muxingSessions.delete(sessionId);
            LiveQuotaStore.Instance.removeLive(user.id, sessionId);
            muxingSession.destroy();
            return this.onAfterMuxingCleanup({ videoUUID, liveSession })
                .catch(err => logger.error('Error in end transmuxing.', Object.assign({ err }, localLTags)));
        });
        this.muxingSessions.set(sessionId, muxingSession);
        muxingSession.runMuxing()
            .catch(err => {
            logger.error('Cannot run muxing.', Object.assign({ err }, localLTags));
            this.muxingSessions.delete(sessionId);
            muxingSession.destroy();
            this.stopSessionOfVideo({
                videoUUID,
                error: err.liveVideoErrorCode || LiveVideoError.UNKNOWN_ERROR,
                errorOnReplay: true
            });
        });
    }
    async publishAndFederateLive(options) {
        const { live, ratio, audioOnlyOutput, localLTags } = options;
        const videoId = live.videoId;
        try {
            const video = await VideoModel.loadFull(videoId);
            logger.info('Will publish and federate live %s.', video.url, localLTags);
            video.state = VideoState.PUBLISHED;
            video.publishedAt = new Date();
            video.aspectRatio = audioOnlyOutput
                ? 0
                : ratio;
            await video.save();
            live.Video = video;
            await wait(getLiveSegmentTime(live.latencyMode) * 1000 * VIDEO_LIVE.EDGE_LIVE_DELAY_SEGMENTS_NOTIFICATION);
            try {
                await federateVideoIfNeeded(video, false);
            }
            catch (err) {
                logger.error('Cannot federate live video %s.', video.url, Object.assign({ err }, localLTags));
            }
            Notifier.Instance.notifyOnNewVideoOrLiveIfNeeded(video);
            PeerTubeSocket.Instance.sendVideoLiveNewState(video);
            Hooks.runAction('action:live.video.state.updated', { video });
        }
        catch (err) {
            logger.error('Cannot save/federate live video %d.', videoId, Object.assign({ err }, localLTags));
        }
    }
    onMuxingFFmpegEnd(videoUUID, sessionId) {
        if (!this.videoSessions.has(videoUUID))
            return;
        this.videoSessions.delete(videoUUID);
        this.saveEndingSession({ videoUUID, error: null })
            .catch(err => logger.error('Cannot save ending session.', Object.assign({ err }, lTags(sessionId))));
    }
    async onAfterMuxingCleanup(options) {
        var _a;
        const { videoUUID, liveSession: liveSessionArg, cleanupNow = false } = options;
        logger.debug('Live of video %s has been cleaned up. Moving to its next state.', videoUUID, lTags(videoUUID));
        try {
            const fullVideo = await VideoModel.loadFull(videoUUID);
            if (!fullVideo)
                return;
            const live = await VideoLiveModel.loadByVideoId(fullVideo.id);
            const liveSession = liveSessionArg !== null && liveSessionArg !== void 0 ? liveSessionArg : await VideoLiveSessionModel.findLatestSessionOf(fullVideo.id);
            if (!liveSession.endDate) {
                liveSession.endDate = new Date();
                await liveSession.save();
            }
            JobQueue.Instance.createJobAsync({
                type: 'video-live-ending',
                payload: {
                    videoId: fullVideo.id,
                    replayDirectory: live.saveReplay
                        ? await this.findReplayDirectory(fullVideo)
                        : undefined,
                    liveSessionId: liveSession.id,
                    streamingPlaylistId: (_a = fullVideo.getHLSPlaylist()) === null || _a === void 0 ? void 0 : _a.id,
                    publishedAt: fullVideo.publishedAt.toISOString()
                },
                delay: cleanupNow
                    ? 0
                    : VIDEO_LIVE.CLEANUP_DELAY
            });
            fullVideo.state = live.permanentLive
                ? VideoState.WAITING_FOR_LIVE
                : VideoState.LIVE_ENDED;
            await fullVideo.save();
            PeerTubeSocket.Instance.sendVideoLiveNewState(fullVideo);
            await federateVideoIfNeeded(fullVideo, false);
            Hooks.runAction('action:live.video.state.updated', { video: fullVideo });
        }
        catch (err) {
            logger.error('Cannot save/federate new video state of live streaming of video %s.', videoUUID, Object.assign({ err }, lTags(videoUUID)));
        }
    }
    async handleBrokenLives() {
        await RunnerJobModel.cancelAllNonFinishedJobs({ type: 'live-rtmp-hls-transcoding' });
        const videoUUIDs = await VideoModel.listPublishedLiveUUIDs();
        for (const uuid of videoUUIDs) {
            await this.onAfterMuxingCleanup({ videoUUID: uuid, cleanupNow: true });
        }
    }
    async findReplayDirectory(video) {
        const directory = getLiveReplayBaseDirectory(video);
        const files = await readdir(directory);
        if (files.length === 0)
            return undefined;
        return files.sort().reverse()[0];
    }
    buildAllResolutionsToTranscode(originResolution, hasAudio) {
        if (!CONFIG.LIVE.TRANSCODING.ENABLED)
            return [originResolution];
        const includeInput = CONFIG.LIVE.TRANSCODING.ALWAYS_TRANSCODE_ORIGINAL_RESOLUTION;
        const resolutionsEnabled = computeResolutionsToTranscode({
            input: originResolution,
            type: 'live',
            includeInput,
            strictLower: false,
            hasAudio
        });
        if (hasAudio && resolutionsEnabled.length !== 0 && !resolutionsEnabled.includes(VideoResolution.H_NOVIDEO)) {
            resolutionsEnabled.push(VideoResolution.H_NOVIDEO);
        }
        if (resolutionsEnabled.length === 0)
            return [originResolution];
        return resolutionsEnabled;
    }
    saveStartingSession(videoLive) {
        const replaySettings = videoLive.saveReplay
            ? new VideoLiveReplaySettingModel({
                privacy: videoLive.ReplaySetting.privacy
            })
            : null;
        return retryTransactionWrapper(() => {
            return sequelizeTypescript.transaction(async (t) => {
                if (videoLive.saveReplay) {
                    await replaySettings.save({ transaction: t });
                }
                return VideoLiveSessionModel.create({
                    startDate: new Date(),
                    liveVideoId: videoLive.videoId,
                    saveReplay: videoLive.saveReplay,
                    replaySettingId: videoLive.saveReplay ? replaySettings.id : null,
                    endingProcessed: false
                }, { transaction: t });
            });
        });
    }
    async saveEndingSession(options) {
        const { videoUUID, error, errorOnReplay } = options;
        const liveSession = await VideoLiveSessionModel.findCurrentSessionOf(videoUUID);
        if (!liveSession)
            return;
        liveSession.endDate = new Date();
        liveSession.error = error;
        if (errorOnReplay === true) {
            liveSession.endingProcessed = true;
        }
        return liveSession.save();
    }
    static get Instance() {
        return this.instance || (this.instance = new this());
    }
}
export { LiveManager };
//# sourceMappingURL=live-manager.js.map