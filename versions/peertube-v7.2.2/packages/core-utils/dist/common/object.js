export function pick(object, keys) {
    const result = {};
    for (const key of keys) {
        if (Object.prototype.hasOwnProperty.call(object, key)) {
            result[key] = object[key];
        }
    }
    return result;
}
export function omit(object, keys) {
    const result = {};
    const keysSet = new Set(keys);
    for (const [key, value] of Object.entries(object)) {
        if (keysSet.has(key))
            continue;
        result[key] = value;
    }
    return result;
}
export function objectKeysTyped(object) {
    return Object.keys(object);
}
export function getKeys(object, keys) {
    return Object.keys(object).filter(k => keys.includes(k));
}
export function hasKey(obj, k) {
    return k in obj;
}
export function sortObjectComparator(key, order) {
    return (a, b) => {
        if (a[key] < b[key]) {
            return order === 'asc' ? -1 : 1;
        }
        if (a[key] > b[key]) {
            return order === 'asc' ? 1 : -1;
        }
        return 0;
    };
}
export function shallowCopy(o) {
    return Object.assign(Object.create(Object.getPrototypeOf(o)), o);
}
export function exists(value) {
    return value !== undefined && value !== null;
}
export function simpleObjectsDeepEqual(a, b) {
    if (a === b)
        return true;
    if (a === undefined && b === undefined)
        return true;
    if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) {
        return false;
    }
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length !== keysB.length)
        return false;
    for (const key of keysA) {
        if (!keysB.includes(key))
            return false;
        if (!simpleObjectsDeepEqual(a[key], b[key]))
            return false;
    }
    return true;
}
//# sourceMappingURL=object.js.map