import { LRUCache } from 'lru-cache';
import { LRU_CACHE } from '../initializers/constants.js';
import { pick } from '@peertube/peertube-core-utils';
import { buildUUID } from '@peertube/peertube-node-utils';
class VideoTokensManager {
    constructor() {
        this.lruCache = new LRUCache({
            max: LRU_CACHE.VIDEO_TOKENS.MAX_SIZE,
            ttl: LRU_CACHE.VIDEO_TOKENS.TTL
        });
    }
    createForAuthUser(options) {
        const { token, expires } = this.generateVideoToken();
        this.lruCache.set(token, pick(options, ['user', 'videoUUID']));
        return { token, expires };
    }
    createForPasswordProtectedVideo(options) {
        const { token, expires } = this.generateVideoToken();
        this.lruCache.set(token, pick(options, ['videoUUID']));
        return { token, expires };
    }
    hasToken(options) {
        const value = this.lruCache.get(options.token);
        if (!value)
            return false;
        return value.videoUUID === options.videoUUID;
    }
    getUserFromToken(options) {
        const value = this.lruCache.get(options.token);
        if (!value)
            return undefined;
        return value.user;
    }
    static get Instance() {
        return this.instance || (this.instance = new this());
    }
    generateVideoToken() {
        const token = buildUUID();
        const expires = new Date(new Date().getTime() + LRU_CACHE.VIDEO_TOKENS.TTL);
        return { token, expires };
    }
}
export { VideoTokensManager };
//# sourceMappingURL=video-tokens-manager.js.map