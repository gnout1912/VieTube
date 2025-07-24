export function Debounce(config) {
    let timeoutRef;
    return function (_target, _key, descriptor) {
        const original = descriptor.value;
        descriptor.value = function (...args) {
            clearTimeout(timeoutRef);
            timeoutRef = setTimeout(() => {
                original.apply(this, args);
            }, config.timeoutMS);
        };
    };
}
//# sourceMappingURL=debounce.js.map