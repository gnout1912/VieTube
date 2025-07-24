"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractTableFromQuery = void 0;
const extractTableFromQuery = (query) => {
    try {
        const result = query === null || query === void 0 ? void 0 : query.match(/(?<=from|join|truncate)\s+\"?\`?(\w+)\"?\`?/gi);
        if (!Array.isArray(result))
            return;
        return result
            .map((table) => table
            .trim()
            .replace(/^"(.*)"$/, '$1')
            .replace(/^`(.*)`$/, '$1'))
            .sort()
            .join(',');
    }
    catch (_a) {
        return;
    }
};
exports.extractTableFromQuery = extractTableFromQuery;
//# sourceMappingURL=utils.js.map