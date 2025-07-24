export function isPromise(value) {
    return value && typeof value.then === 'function';
}
export function isCatchable(value) {
    return value && typeof value.catch === 'function';
}
export function timeoutPromise(promise, timeoutMs) {
    let timer;
    return Promise.race([
        promise,
        new Promise((_res, rej) => {
            timer = setTimeout(() => rej(new Error('Timeout')), timeoutMs);
        })
    ]).finally(() => clearTimeout(timer));
}
export function promisify0(func) {
    return function promisified() {
        return new Promise((resolve, reject) => {
            func.apply(null, [(err, res) => err ? reject(err) : resolve(res)]);
        });
    };
}
export function promisify1(func) {
    return function promisified(arg) {
        return new Promise((resolve, reject) => {
            func.apply(null, [arg, (err, res) => err ? reject(err) : resolve(res)]);
        });
    };
}
export function promisify2(func) {
    return function promisified(arg1, arg2) {
        return new Promise((resolve, reject) => {
            func.apply(null, [arg1, arg2, (err, res) => err ? reject(err) : resolve(res)]);
        });
    };
}
export function promisify3(func) {
    return function promisified(arg1, arg2, arg3) {
        return new Promise((resolve, reject) => {
            func.apply(null, [arg1, arg2, arg3, (err, res) => err ? reject(err) : resolve(res)]);
        });
    };
}
//# sourceMappingURL=promises.js.map