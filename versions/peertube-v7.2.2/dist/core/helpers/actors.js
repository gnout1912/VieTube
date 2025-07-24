import { WEBSERVER } from '../initializers/constants.js';
export function handleToNameAndHost(handle) {
    let [name, host] = handle.split('@');
    if (host === WEBSERVER.HOST)
        host = null;
    return { name, host, handle };
}
export function handlesToNameAndHost(handles) {
    return handles.map(h => handleToNameAndHost(h));
}
const accountType = new Set(['Person', 'Application', 'Service', 'Organization']);
export function isAccountActor(type) {
    return accountType.has(type);
}
export function isChannelActor(type) {
    return type === 'Group';
}
//# sourceMappingURL=actors.js.map