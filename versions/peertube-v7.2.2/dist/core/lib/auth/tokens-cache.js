import { LRUCache } from 'lru-cache';
import { LRU_CACHE } from '../../initializers/constants.js';
export class TokensCache {
    constructor() {
        this.accessTokenCache = new LRUCache({ max: LRU_CACHE.USER_TOKENS.MAX_SIZE });
        this.userHavingToken = new LRUCache({ max: LRU_CACHE.USER_TOKENS.MAX_SIZE });
    }
    static get Instance() {
        return this.instance || (this.instance = new this());
    }
    hasToken(token) {
        return this.accessTokenCache.has(token);
    }
    getByToken(token) {
        return this.accessTokenCache.get(token);
    }
    setToken(token) {
        this.accessTokenCache.set(token.accessToken, token);
        this.userHavingToken.set(token.userId, token.accessToken);
    }
    deleteUserToken(userId) {
        this.clearCacheByUserId(userId);
    }
    clearCacheByUserId(userId) {
        const token = this.userHavingToken.get(userId);
        if (token !== undefined) {
            this.accessTokenCache.delete(token);
            this.userHavingToken.delete(userId);
        }
    }
    clearCacheByToken(token) {
        const tokenModel = this.accessTokenCache.get(token);
        if (tokenModel !== undefined) {
            this.userHavingToken.delete(tokenModel.userId);
            this.accessTokenCache.delete(token);
        }
    }
}
//# sourceMappingURL=tokens-cache.js.map