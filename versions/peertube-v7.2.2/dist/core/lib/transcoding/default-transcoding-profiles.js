import { logger } from '../../helpers/logger.js';
import { FFmpegCommandWrapper, getDefaultAvailableEncoders } from '@peertube/peertube-ffmpeg';
class VideoTranscodingProfilesManager {
    constructor() {
        this.encodersPriorities = {
            vod: this.buildDefaultEncodersPriorities(),
            live: this.buildDefaultEncodersPriorities()
        };
        this.availableEncoders = getDefaultAvailableEncoders();
        this.availableProfiles = {
            vod: [],
            live: []
        };
        this.buildAvailableProfiles();
    }
    getAvailableEncoders() {
        return {
            available: this.availableEncoders,
            encodersToTry: {
                vod: {
                    video: this.getEncodersByPriority('vod', 'video'),
                    audio: this.getEncodersByPriority('vod', 'audio')
                },
                live: {
                    video: this.getEncodersByPriority('live', 'video'),
                    audio: this.getEncodersByPriority('live', 'audio')
                }
            }
        };
    }
    getAvailableProfiles(type) {
        return this.availableProfiles[type];
    }
    addProfile(options) {
        const { type, encoder, profile, builder } = options;
        const encoders = this.availableEncoders[type];
        if (!encoders[encoder])
            encoders[encoder] = {};
        encoders[encoder][profile] = builder;
        this.buildAvailableProfiles();
    }
    removeProfile(options) {
        const { type, encoder, profile } = options;
        delete this.availableEncoders[type][encoder][profile];
        this.buildAvailableProfiles();
    }
    addEncoderPriority(type, streamType, encoder, priority) {
        this.encodersPriorities[type][streamType].push({ name: encoder, priority, isDefault: false });
        FFmpegCommandWrapper.resetSupportedEncoders();
    }
    removeEncoderPriority(type, streamType, encoder, priority) {
        this.encodersPriorities[type][streamType] = this.encodersPriorities[type][streamType]
            .filter(o => {
            if (o.isDefault)
                return true;
            if (o.name === encoder && o.priority === priority)
                return false;
            return true;
        });
        FFmpegCommandWrapper.resetSupportedEncoders();
    }
    getEncodersByPriority(type, streamType) {
        return this.encodersPriorities[type][streamType]
            .sort((e1, e2) => {
            if (e1.priority > e2.priority)
                return -1;
            else if (e1.priority === e2.priority)
                return 0;
            return 1;
        })
            .map(e => e.name);
    }
    buildAvailableProfiles() {
        for (const type of ['vod', 'live']) {
            const result = new Set();
            const encoders = this.availableEncoders[type];
            for (const encoderName of Object.keys(encoders)) {
                for (const profile of Object.keys(encoders[encoderName])) {
                    result.add(profile);
                }
            }
            this.availableProfiles[type] = Array.from(result);
        }
        logger.debug('Available transcoding profiles built.', { availableProfiles: this.availableProfiles });
    }
    buildDefaultEncodersPriorities() {
        return {
            video: [
                { name: 'libx264', priority: 100, isDefault: true }
            ],
            audio: [
                { name: 'libfdk_aac', priority: 200, isDefault: true },
                { name: 'aac', priority: 100, isDefault: true }
            ]
        };
    }
    static get Instance() {
        return this.instance || (this.instance = new this());
    }
}
export { VideoTranscodingProfilesManager };
//# sourceMappingURL=default-transcoding-profiles.js.map