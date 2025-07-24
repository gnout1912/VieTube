export function findCommonElement(array1, array2) {
    for (const a of array1) {
        for (const b of array2) {
            if (a === b)
                return a;
        }
    }
    return null;
}
export function arrayify(element) {
    if (Array.isArray(element))
        return element;
    if (element === undefined || element === null)
        return [];
    return [element];
}
export function unarray(element) {
    if (Array.isArray(element)) {
        if (element.length === 0)
            return undefined;
        return element[0];
    }
    return element;
}
export function uniqify(elements) {
    return Array.from(new Set(elements));
}
export function shuffle(elements) {
    const shuffled = [...elements];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}
export function sortBy(obj, key1, key2) {
    return obj.sort((a, b) => {
        const elem1 = key2 ? a[key1][key2] : a[key1];
        const elem2 = key2 ? b[key1][key2] : b[key1];
        if (elem1 < elem2)
            return -1;
        if (elem1 === elem2)
            return 0;
        return 1;
    });
}
export function maxBy(arr, property) {
    let result;
    for (const obj of arr) {
        if (!result || result[property] < obj[property])
            result = obj;
    }
    return result;
}
export function minBy(arr, property) {
    let result;
    for (const obj of arr) {
        if (!result || result[property] > obj[property])
            result = obj;
    }
    return result;
}
//# sourceMappingURL=array.js.map