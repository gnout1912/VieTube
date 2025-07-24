import { sha256 } from '@peertube/peertube-node-utils';
import { exists } from '../helpers/custom-validators/misc.js';
import { Redis as IoRedis } from 'ioredis';
import { logger, loggerTagsFactory } from '../helpers/logger.js';
import { generateRandomString } from '../helpers/utils.js';
import { CONFIG } from '../initializers/config.js';
import { AP_CLEANER, CONTACT_FORM_LIFETIME, EMAIL_VERIFY_LIFETIME, RESUMABLE_UPLOAD_SESSION_LIFETIME, TWO_FACTOR_AUTH_REQUEST_TOKEN_LIFETIME, USER_PASSWORD_CREATE_LIFETIME, USER_PASSWORD_RESET_LIFETIME, VIEW_LIFETIME, WEBSERVER } from '../initializers/constants.js';
const lTags = loggerTagsFactory('redis');
class Redis {
    constructor() {
        this.initialized = false;
        this.connected = false;
    }
    init() {
        if (this.initialized === true)
            return;
        this.initialized = true;
        const redisMode = CONFIG.REDIS.SENTINEL.ENABLED ? 'sentinel' : 'standalone';
        logger.info(`Connecting to Redis in "${redisMode}" mode...`, lTags());
        this.client = new IoRedis(Redis.getRedisClientOptions('', { enableAutoPipelining: true }, true));
        this.client.on('error', err => logger.error('Redis failed to connect', Object.assign({ err }, lTags())));
        this.client.on('connect', () => {
            logger.info('Connected to redis.', lTags());
            this.connected = true;
        });
        this.client.on('reconnecting', (ms) => {
            logger.error(`Reconnecting to redis in ${ms}.`, lTags());
        });
        this.client.on('close', () => {
            logger.error('Connection to redis has closed.', lTags());
            this.connected = false;
        });
        this.client.on('end', () => {
            logger.error('Connection to redis has closed and no more reconnects will be done.', lTags());
        });
        this.prefix = 'redis-' + WEBSERVER.HOST + '-';
    }
    static getRedisClientOptions(name, options = {}, logOptions = false) {
        const connectionName = ['PeerTube', name].join('');
        const connectTimeout = 20000;
        if (CONFIG.REDIS.SENTINEL.ENABLED) {
            if (logOptions) {
                logger.info(`Using sentinel redis options`, Object.assign({ sentinels: CONFIG.REDIS.SENTINEL.SENTINELS, name: CONFIG.REDIS.SENTINEL.MASTER_NAME }, lTags()));
            }
            return Object.assign({ connectionName,
                connectTimeout, enableTLSForSentinelMode: CONFIG.REDIS.SENTINEL.ENABLE_TLS, sentinelPassword: CONFIG.REDIS.AUTH, sentinels: CONFIG.REDIS.SENTINEL.SENTINELS, name: CONFIG.REDIS.SENTINEL.MASTER_NAME }, options);
        }
        if (logOptions) {
            logger.info(`Using standalone redis options`, Object.assign({ db: CONFIG.REDIS.DB, host: CONFIG.REDIS.HOSTNAME, port: CONFIG.REDIS.PORT, path: CONFIG.REDIS.SOCKET }, lTags()));
        }
        return Object.assign({ connectionName,
            connectTimeout, password: CONFIG.REDIS.AUTH, db: CONFIG.REDIS.DB, host: CONFIG.REDIS.HOSTNAME, port: CONFIG.REDIS.PORT, path: CONFIG.REDIS.SOCKET, showFriendlyErrorStack: true }, options);
    }
    getClient() {
        return this.client;
    }
    getPrefix() {
        return this.prefix;
    }
    isConnected() {
        return this.connected;
    }
    async setResetPasswordVerificationString(userId) {
        const generatedString = await generateRandomString(32);
        await this.setValue(this.generateResetPasswordKey(userId), generatedString, USER_PASSWORD_RESET_LIFETIME);
        return generatedString;
    }
    async setCreatePasswordVerificationString(userId) {
        const generatedString = await generateRandomString(32);
        await this.setValue(this.generateResetPasswordKey(userId), generatedString, USER_PASSWORD_CREATE_LIFETIME);
        return generatedString;
    }
    async removePasswordVerificationString(userId) {
        return this.removeValue(this.generateResetPasswordKey(userId));
    }
    async getResetPasswordVerificationString(userId) {
        return this.getValue(this.generateResetPasswordKey(userId));
    }
    async setTwoFactorRequest(userId, otpSecret) {
        const requestToken = await generateRandomString(32);
        await this.setValue(this.generateTwoFactorRequestKey(userId, requestToken), otpSecret, TWO_FACTOR_AUTH_REQUEST_TOKEN_LIFETIME);
        return requestToken;
    }
    async getTwoFactorRequestToken(userId, requestToken) {
        return this.getValue(this.generateTwoFactorRequestKey(userId, requestToken));
    }
    async setUserVerifyEmailVerificationString(userId) {
        const generatedString = await generateRandomString(32);
        await this.setValue(this.generateUserVerifyEmailKey(userId), generatedString, EMAIL_VERIFY_LIFETIME);
        return generatedString;
    }
    async getUserVerifyEmailLink(userId) {
        return this.getValue(this.generateUserVerifyEmailKey(userId));
    }
    async setRegistrationVerifyEmailVerificationString(registrationId) {
        const generatedString = await generateRandomString(32);
        await this.setValue(this.generateRegistrationVerifyEmailKey(registrationId), generatedString, EMAIL_VERIFY_LIFETIME);
        return generatedString;
    }
    async getRegistrationVerifyEmailLink(registrationId) {
        return this.getValue(this.generateRegistrationVerifyEmailKey(registrationId));
    }
    async setContactFormIp(ip) {
        return this.setValue(this.generateContactFormKey(ip), '1', CONTACT_FORM_LIFETIME);
    }
    async doesContactFormIpExist(ip) {
        return this.exists(this.generateContactFormKey(ip));
    }
    setSessionIdVideoView(ip, videoUUID) {
        return this.setValue(this.generateSessionIdViewKey(ip, videoUUID), '1', VIEW_LIFETIME.VIEW);
    }
    async doesVideoSessionIdViewExist(sessionId, videoUUID) {
        return this.exists(this.generateSessionIdViewKey(sessionId, videoUUID));
    }
    addVideoViewStats(videoId) {
        const { videoKey, setKey } = this.generateVideoViewStatsKeys({ videoId });
        return Promise.all([
            this.addToSet(setKey, videoId.toString()),
            this.increment(videoKey)
        ]);
    }
    async getVideoViewsStats(videoId, hour) {
        const { videoKey } = this.generateVideoViewStatsKeys({ videoId, hour });
        const valueString = await this.getValue(videoKey);
        const valueInt = parseInt(valueString, 10);
        if (isNaN(valueInt)) {
            logger.error(`Cannot get videos views stats of video ${videoId} in hour ${hour}: views number is NaN (${valueString}).`, lTags());
            return undefined;
        }
        return valueInt;
    }
    async listVideosViewedForStats(hour) {
        const { setKey } = this.generateVideoViewStatsKeys({ hour });
        const stringIds = await this.getSet(setKey);
        return stringIds.map(s => parseInt(s, 10));
    }
    deleteVideoViewsStats(videoId, hour) {
        const { setKey, videoKey } = this.generateVideoViewStatsKeys({ videoId, hour });
        return Promise.all([
            this.deleteFromSet(setKey, videoId.toString()),
            this.deleteKey(videoKey)
        ]);
    }
    addLocalVideoView(videoId) {
        const { videoKey, setKey } = this.generateLocalVideoViewsKeys(videoId);
        return Promise.all([
            this.addToSet(setKey, videoId.toString()),
            this.increment(videoKey)
        ]);
    }
    async getLocalVideoViews(videoId) {
        const { videoKey } = this.generateLocalVideoViewsKeys(videoId);
        const valueString = await this.getValue(videoKey);
        const valueInt = parseInt(valueString, 10);
        if (isNaN(valueInt)) {
            logger.error(`Cannot get videos views of video ${videoId}: views number is NaN (${valueString}).`, lTags());
            return undefined;
        }
        return valueInt;
    }
    async listLocalVideosViewed() {
        const { setKey } = this.generateLocalVideoViewsKeys();
        const stringIds = await this.getSet(setKey);
        return stringIds.map(s => parseInt(s, 10));
    }
    deleteLocalVideoViews(videoId) {
        const { setKey, videoKey } = this.generateLocalVideoViewsKeys(videoId);
        return Promise.all([
            this.deleteFromSet(setKey, videoId.toString()),
            this.deleteKey(videoKey)
        ]);
    }
    getLocalVideoViewer(options) {
        if (options.key)
            return this.getObject(options.key);
        const { viewerKey } = this.generateLocalVideoViewerKeys(options.ip, options.videoId);
        return this.getObject(viewerKey);
    }
    setLocalVideoViewer(sessionId, videoId, object) {
        const { setKey, viewerKey } = this.generateLocalVideoViewerKeys(sessionId, videoId);
        return Promise.all([
            this.addToSet(setKey, viewerKey),
            this.setObject(viewerKey, object)
        ]);
    }
    listLocalVideoViewerKeys() {
        const { setKey } = this.generateLocalVideoViewerKeys();
        return this.getSet(setKey);
    }
    deleteLocalVideoViewersKeys(key) {
        const { setKey } = this.generateLocalVideoViewerKeys();
        return Promise.all([
            this.deleteFromSet(setKey, key),
            this.deleteKey(key)
        ]);
    }
    setUploadSession(uploadId) {
        return this.setValue('resumable-upload-' + uploadId, '', RESUMABLE_UPLOAD_SESSION_LIFETIME);
    }
    doesUploadSessionExist(uploadId) {
        return this.exists('resumable-upload-' + uploadId);
    }
    deleteUploadSession(uploadId) {
        return this.deleteKey('resumable-upload-' + uploadId);
    }
    async addAPUnavailability(url) {
        const key = this.generateAPUnavailabilityKey(url);
        const value = await this.increment(key);
        await this.setExpiration(key, AP_CLEANER.PERIOD * 2);
        return value;
    }
    generateLocalVideoViewsKeys(videoId) {
        return { setKey: `local-video-views-buffer`, videoKey: `local-video-views-buffer-${videoId}` };
    }
    generateLocalVideoViewerKeys(sessionId, videoId) {
        return {
            setKey: `local-video-viewer-stats-keys`,
            viewerKey: sessionId && videoId
                ? `local-video-viewer-stats-${sessionId}-${videoId}`
                : undefined
        };
    }
    generateVideoViewStatsKeys(options) {
        const hour = exists(options.hour)
            ? options.hour
            : new Date().getHours();
        return { setKey: `videos-view-h${hour}`, videoKey: `video-view-${options.videoId}-h${hour}` };
    }
    generateResetPasswordKey(userId) {
        return 'reset-password-' + userId;
    }
    generateTwoFactorRequestKey(userId, token) {
        return 'two-factor-request-' + userId + '-' + token;
    }
    generateUserVerifyEmailKey(userId) {
        return 'verify-email-user-' + userId;
    }
    generateRegistrationVerifyEmailKey(registrationId) {
        return 'verify-email-registration-' + registrationId;
    }
    generateSessionIdViewKey(sessionId, videoUUID) {
        return `views-${videoUUID}-${sessionId}`;
    }
    generateContactFormKey(ip) {
        return 'contact-form-' + sha256(CONFIG.SECRETS.PEERTUBE + '-' + ip);
    }
    generateAPUnavailabilityKey(url) {
        return 'ap-unavailability-' + sha256(url);
    }
    getValue(key) {
        return this.client.get(this.prefix + key);
    }
    getSet(key) {
        return this.client.smembers(this.prefix + key);
    }
    addToSet(key, value) {
        return this.client.sadd(this.prefix + key, value);
    }
    deleteFromSet(key, value) {
        return this.client.srem(this.prefix + key, value);
    }
    deleteKey(key) {
        return this.client.del(this.prefix + key);
    }
    async getObject(key) {
        const value = await this.getValue(key);
        if (!value)
            return null;
        return JSON.parse(value);
    }
    setObject(key, value, expirationMilliseconds) {
        return this.setValue(key, JSON.stringify(value), expirationMilliseconds);
    }
    async setValue(key, value, expirationMilliseconds) {
        const result = expirationMilliseconds !== undefined
            ? await this.client.set(this.prefix + key, value, 'PX', expirationMilliseconds)
            : await this.client.set(this.prefix + key, value);
        if (result !== 'OK')
            throw new Error('Redis set result is not OK.');
    }
    removeValue(key) {
        return this.client.del(this.prefix + key);
    }
    increment(key) {
        return this.client.incr(this.prefix + key);
    }
    async exists(key) {
        const result = await this.client.exists(this.prefix + key);
        return result !== 0;
    }
    setExpiration(key, ms) {
        return this.client.expire(this.prefix + key, ms / 1000);
    }
    static get Instance() {
        return this.instance || (this.instance = new this());
    }
}
export { Redis };
//# sourceMappingURL=redis.js.map