export function regexpCapture(str, regex, maxIterations = 100) {
    const result = [];
    let m;
    let i = 0;
    while ((m = regex.exec(str)) !== null && i < maxIterations) {
        if (m.index === regex.lastIndex) {
            regex.lastIndex++;
        }
        result.push(m);
        i++;
    }
    return result;
}
export function wordsToRegExp(words) {
    if (words.length === 0)
        throw new Error('Need words with at least one element');
    const innerRegex = words
        .map(word => escapeForRegex(word.trim()))
        .join('|');
    return new RegExp(`(?:\\P{L}|^)(?:${innerRegex})(?=\\P{L}|$)`, 'iu');
}
export function escapeForRegex(value) {
    return value.replace(/[\\^$.*+?()[\]{}|]/g, '\\$&');
}
//# sourceMappingURL=regexp.js.map