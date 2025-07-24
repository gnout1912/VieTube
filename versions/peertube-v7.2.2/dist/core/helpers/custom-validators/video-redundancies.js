import { exists } from './misc.js';
function isVideoRedundancyTarget(value) {
    return exists(value) &&
        (value === 'my-videos' || value === 'remote-videos');
}
export { isVideoRedundancyTarget };
//# sourceMappingURL=video-redundancies.js.map