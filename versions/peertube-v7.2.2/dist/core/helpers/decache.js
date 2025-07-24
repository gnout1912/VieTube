import { Module } from 'module';
import { extname } from 'path';
function decachePlugin(require, libraryPath) {
    const moduleName = find(require, libraryPath);
    if (!moduleName)
        return;
    searchCache(require, moduleName, function (mod) {
        delete require.cache[mod.id];
        removeCachedPath(mod.path);
    });
}
function decacheModule(require, name) {
    const moduleName = find(require, name);
    if (!moduleName)
        return;
    searchCache(require, moduleName, function (mod) {
        delete require.cache[mod.id];
        removeCachedPath(mod.path);
    });
}
export { decacheModule, decachePlugin };
function find(require, moduleName) {
    try {
        return require.resolve(moduleName);
    }
    catch (_a) {
        return '';
    }
}
function searchCache(require, moduleName, callback) {
    const resolvedModule = require.resolve(moduleName);
    let mod;
    const visited = {};
    if (resolvedModule && ((mod = require.cache[resolvedModule]) !== undefined)) {
        ;
        (function run(current) {
            visited[current.id] = true;
            current.children.forEach(function (child) {
                if (extname(child.filename) !== '.node' && !visited[child.id]) {
                    run(child);
                }
            });
            callback(current);
        })(mod);
    }
}
function removeCachedPath(pluginPath) {
    const pathCache = Module._pathCache;
    Object.keys(pathCache).forEach(function (cacheKey) {
        if (cacheKey.includes(pluginPath)) {
            delete pathCache[cacheKey];
        }
    });
}
//# sourceMappingURL=decache.js.map