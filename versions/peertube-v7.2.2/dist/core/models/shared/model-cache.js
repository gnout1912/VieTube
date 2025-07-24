import { logger } from '../../helpers/logger.js';
class ModelCache {
    constructor() {
        this.localCache = {
            'server-account': new Map(),
            'local-actor-name': new Map(),
            'local-actor-url': new Map(),
            'load-video-immutable-id': new Map(),
            'load-video-immutable-url': new Map()
        };
        this.deleteIds = {
            video: new Map()
        };
    }
    static get Instance() {
        return this.instance || (this.instance = new this());
    }
    doCache(options) {
        const { cacheType, key, fun, whitelist, deleteKey } = options;
        if (whitelist && whitelist() !== true)
            return fun();
        const cache = this.localCache[cacheType];
        if (cache.has(key)) {
            logger.debug('Model cache hit for %s -> %s.', cacheType, key);
            return Promise.resolve(cache.get(key));
        }
        return fun().then(m => {
            if (!m)
                return m;
            if (!whitelist || whitelist())
                cache.set(key, m);
            if (deleteKey) {
                const map = this.deleteIds[deleteKey];
                if (!map.has(m.id))
                    map.set(m.id, []);
                const a = map.get(m.id);
                a.push({ cacheType, key });
            }
            return m;
        });
    }
    invalidateCache(deleteKey, modelId) {
        const map = this.deleteIds[deleteKey];
        if (!map.has(modelId))
            return;
        for (const toDelete of map.get(modelId)) {
            logger.debug('Removing %s -> %d of model cache %s -> %s.', deleteKey, modelId, toDelete.cacheType, toDelete.key);
            this.localCache[toDelete.cacheType].delete(toDelete.key);
        }
        map.delete(modelId);
    }
    clearCache(cacheType) {
        this.localCache[cacheType] = new Map();
    }
}
export { ModelCache };
//# sourceMappingURL=model-cache.js.map