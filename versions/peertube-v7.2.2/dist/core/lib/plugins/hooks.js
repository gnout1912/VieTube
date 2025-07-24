import { logger } from '../../helpers/logger.js';
import { PluginManager } from './plugin-manager.js';
const Hooks = {
    wrapObject: (result, hookName, context) => {
        return PluginManager.Instance.runHook(hookName, result, context);
    },
    wrapPromiseFun: async (fun, params, hookName) => {
        const result = await fun(params);
        return PluginManager.Instance.runHook(hookName, result, params);
    },
    wrapFun: async (fun, params, hookName) => {
        const result = fun(params);
        return PluginManager.Instance.runHook(hookName, result, params);
    },
    runAction: (hookName, params) => {
        PluginManager.Instance.runHook(hookName, undefined, params)
            .catch(err => logger.error('Fatal hook error.', { err }));
    }
};
export { Hooks };
//# sourceMappingURL=hooks.js.map