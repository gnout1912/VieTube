import memoizee from 'memoizee';
export function Memoize(config) {
    return function (_target, _key, descriptor) {
        const oldFunction = descriptor.value;
        const newFunction = memoizee(oldFunction, config);
        descriptor.value = function () {
            return newFunction.apply(this, arguments);
        };
    };
}
//# sourceMappingURL=memoize.js.map