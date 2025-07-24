import { Hooks } from '../plugins/hooks.js';
export function getContextFilter() {
    return (contextData) => {
        return Hooks.wrapObject(contextData, 'filter:activity-pub.activity.context.build.result');
    };
}
//# sourceMappingURL=context.js.map