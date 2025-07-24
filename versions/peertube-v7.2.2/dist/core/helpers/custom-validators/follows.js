import { exists, isArray } from './misc.js';
function isFollowStateValid(value) {
    if (!exists(value))
        return false;
    return value === 'pending' || value === 'accepted' || value === 'rejected';
}
function isRemoteHandleValid(value) {
    if (!exists(value))
        return false;
    if (typeof value !== 'string')
        return false;
    return value.includes('@');
}
function isEachUniqueHandleValid(handles) {
    return isArray(handles) &&
        handles.every(handle => {
            return isRemoteHandleValid(handle) && handles.indexOf(handle) === handles.lastIndexOf(handle);
        });
}
export { isFollowStateValid, isRemoteHandleValid, isEachUniqueHandleValid };
//# sourceMappingURL=follows.js.map