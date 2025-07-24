import { isTestInstance } from '@peertube/peertube-node-utils';
import { parseDurationToMs } from '../../../helpers/core-utils.js';
import { logger } from '../../../helpers/logger.js';
import { Redis } from '../../../lib/redis.js';
import { asyncMiddleware } from '../../index.js';
export class ApiCache {
    constructor(options) {
        this.timers = {};
        this.index = {
            groups: [],
            all: []
        };
        this.groups = {};
        this.seed = new Date().getTime();
        this.options = Object.assign({ headerBlacklist: [], excludeStatus: [] }, options);
    }
    buildMiddleware(strDuration) {
        const duration = parseDurationToMs(strDuration);
        return asyncMiddleware(async (req, res, next) => {
            const key = this.getCacheKey(req);
            const redis = Redis.Instance.getClient();
            if (!Redis.Instance.isConnected())
                return this.makeResponseCacheable(res, next, key, duration);
            try {
                const obj = await redis.hgetall(key);
                if (obj === null || obj === void 0 ? void 0 : obj.response) {
                    return this.sendCachedResponse(req, res, JSON.parse(obj.response), duration);
                }
                return this.makeResponseCacheable(res, next, key, duration);
            }
            catch (err) {
                return this.makeResponseCacheable(res, next, key, duration);
            }
        });
    }
    clearGroupSafe(group) {
        const run = async () => {
            const cacheKeys = this.groups[group];
            if (!cacheKeys)
                return;
            for (const key of cacheKeys) {
                try {
                    await this.clear(key);
                }
                catch (err) {
                    logger.error('Cannot clear ' + key, { err });
                }
            }
            delete this.groups[group];
        };
        void run();
    }
    getCacheKey(req) {
        return Redis.Instance.getPrefix() + 'api-cache-' + this.seed + '-' + req.originalUrl;
    }
    shouldCacheResponse(response) {
        if (!response)
            return false;
        if (this.options.excludeStatus.includes(response.statusCode))
            return false;
        return true;
    }
    addIndexEntries(key, res) {
        this.index.all.unshift(key);
        const groups = res.locals.apicacheGroups || [];
        for (const group of groups) {
            if (!this.groups[group])
                this.groups[group] = [];
            this.groups[group].push(key);
        }
    }
    filterBlacklistedHeaders(headers) {
        return Object.keys(headers)
            .filter(key => !this.options.headerBlacklist.includes(key))
            .reduce((acc, header) => {
            acc[header] = headers[header];
            return acc;
        }, {});
    }
    createCacheObject(status, headers, data, encoding) {
        return {
            status,
            headers: this.filterBlacklistedHeaders(headers),
            data,
            encoding,
            timestamp: new Date().getTime() / 1000
        };
    }
    async cacheResponse(key, value, duration) {
        const redis = Redis.Instance.getClient();
        if (Redis.Instance.isConnected()) {
            await Promise.all([
                redis.hset(key, 'response', JSON.stringify(value)),
                redis.hset(key, 'duration', duration + ''),
                redis.expire(key, duration / 1000)
            ]);
        }
        this.timers[key] = setTimeout(() => {
            this.clear(key)
                .catch(err => logger.error('Cannot clear Redis key %s.', key, { err }));
        }, Math.min(duration, 2147483647));
    }
    accumulateContent(res, content) {
        if (!content)
            return;
        if (typeof content === 'string') {
            res.locals.apicache.content = (res.locals.apicache.content || '') + content;
            return;
        }
        if (Buffer.isBuffer(content)) {
            let oldContent = res.locals.apicache.content;
            if (typeof oldContent === 'string') {
                oldContent = Buffer.from(oldContent);
            }
            if (!oldContent) {
                oldContent = Buffer.alloc(0);
            }
            res.locals.apicache.content = Buffer.concat([oldContent, content], oldContent.length + content.length);
            return;
        }
        res.locals.apicache.content = content;
    }
    makeResponseCacheable(res, next, key, duration) {
        const self = this;
        res.locals.apicache = {
            write: res.write.bind(res),
            writeHead: res.writeHead.bind(res),
            end: res.end.bind(res),
            cacheable: true,
            content: undefined,
            headers: undefined
        };
        res.writeHead = function () {
            if (self.shouldCacheResponse(res)) {
                res.setHeader('cache-control', 'max-age=' + (duration / 1000).toFixed(0));
            }
            else {
                res.setHeader('cache-control', 'no-cache, no-store, must-revalidate');
            }
            res.locals.apicache.headers = Object.assign({}, res.getHeaders());
            return res.locals.apicache.writeHead.apply(this, arguments);
        };
        res.write = function (chunk) {
            self.accumulateContent(res, chunk);
            return res.locals.apicache.write.apply(this, arguments);
        };
        res.end = function (content, encoding) {
            if (self.shouldCacheResponse(res)) {
                self.accumulateContent(res, content);
                if (res.locals.apicache.cacheable && res.locals.apicache.content) {
                    self.addIndexEntries(key, res);
                    const headers = res.locals.apicache.headers || res.getHeaders();
                    const cacheObject = self.createCacheObject(res.statusCode, headers, res.locals.apicache.content, encoding);
                    self.cacheResponse(key, cacheObject, duration)
                        .catch(err => logger.error('Cannot cache response', { err }));
                }
            }
            res.locals.apicache.end.apply(this, arguments);
        };
        next();
    }
    sendCachedResponse(request, response, cacheObject, duration) {
        const headers = response.getHeaders();
        if (isTestInstance()) {
            Object.assign(headers, {
                'x-api-cache-cached': 'true'
            });
        }
        Object.assign(headers, this.filterBlacklistedHeaders(cacheObject.headers || {}), {
            'cache-control': 'max-age=' +
                Math.max(0, (duration / 1000 - (new Date().getTime() / 1000 - cacheObject.timestamp))).toFixed(0)
        });
        let data = cacheObject.data;
        if (data && data.type === 'Buffer') {
            data = typeof data.data === 'number'
                ? Buffer.alloc(data.data)
                : Buffer.from(data.data);
        }
        const cachedEtag = cacheObject.headers.etag;
        const requestEtag = request.headers['if-none-match'];
        if (requestEtag && cachedEtag === requestEtag) {
            response.writeHead(304, headers);
            return response.end();
        }
        response.writeHead(cacheObject.status || 200, headers);
        return response.end(data, cacheObject.encoding);
    }
    async clear(target) {
        const redis = Redis.Instance.getClient();
        if (target) {
            clearTimeout(this.timers[target]);
            delete this.timers[target];
            try {
                await redis.del(target);
            }
            catch (err) {
                logger.error('Cannot delete %s in redis cache.', target, { err });
            }
            this.index.all = this.index.all.filter(key => key !== target);
        }
        else {
            for (const key of this.index.all) {
                clearTimeout(this.timers[key]);
                delete this.timers[key];
                try {
                    await redis.del(key);
                }
                catch (err) {
                    logger.error('Cannot delete %s in redis cache.', key, { err });
                }
            }
            this.index.all = [];
        }
        return this.index;
    }
}
//# sourceMappingURL=api-cache.js.map