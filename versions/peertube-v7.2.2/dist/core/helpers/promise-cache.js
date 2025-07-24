export class CachePromiseFactory {
    constructor(fn, keyBuilder) {
        this.fn = fn;
        this.keyBuilder = keyBuilder;
        this.running = new Map();
    }
    run(arg) {
        return this.runWithContext(null, arg);
    }
    runWithContext(ctx, arg) {
        const key = this.keyBuilder(arg);
        if (this.running.has(key))
            return this.running.get(key);
        const p = this.fn.apply(ctx || this, [arg]);
        this.running.set(key, p);
        return p.finally(() => this.running.delete(key));
    }
}
export function CachePromise(options) {
    return function (_target, _key, descriptor) {
        const promiseCache = new CachePromiseFactory(descriptor.value, options.keyBuilder);
        descriptor.value = function () {
            if (arguments.length !== 1)
                throw new Error('Cache promise only support methods with 1 argument');
            return promiseCache.runWithContext(this, arguments[0]);
        };
    };
}
//# sourceMappingURL=promise-cache.js.map