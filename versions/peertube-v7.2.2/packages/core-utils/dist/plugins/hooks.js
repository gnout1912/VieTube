import { HookType } from '@peertube/peertube-models';
import { isCatchable, isPromise } from '../common/promises.js';
function getHookType(hookName) {
    if (hookName.startsWith('filter:'))
        return HookType.FILTER;
    if (hookName.startsWith('action:'))
        return HookType.ACTION;
    return HookType.STATIC;
}
async function internalRunHook(options) {
    const { handler, hookType, result, params, onError } = options;
    try {
        if (hookType === HookType.FILTER) {
            const p = handler(result, params);
            const newResult = isPromise(p)
                ? await p
                : p;
            return newResult;
        }
        const p = handler(params);
        if (hookType === HookType.STATIC) {
            if (isPromise(p))
                await p;
            return undefined;
        }
        if (hookType === HookType.ACTION) {
            if (isCatchable(p))
                p.catch((err) => onError(err));
            return undefined;
        }
    }
    catch (err) {
        onError(err);
    }
    return result;
}
function getExternalAuthHref(apiUrl, auth) {
    return apiUrl + `/plugins/${auth.name}/${auth.version}/auth/${auth.authName}`;
}
export { getHookType, internalRunHook, getExternalAuthHref };
//# sourceMappingURL=hooks.js.map