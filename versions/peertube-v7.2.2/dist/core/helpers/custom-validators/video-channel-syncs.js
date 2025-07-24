import { VIDEO_CHANNEL_SYNC_STATE } from '../../initializers/constants.js';
import { exists } from './misc.js';
export function isVideoChannelSyncStateValid(value) {
    return exists(value) && VIDEO_CHANNEL_SYNC_STATE[value] !== undefined;
}
//# sourceMappingURL=video-channel-syncs.js.map