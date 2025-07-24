import { VideoState } from '@peertube/peertube-models';
import { AbstractOwnedVideoPublication } from './abstract-owned-video-publication.js';
export class OwnedPublicationAfterScheduleUpdate extends AbstractOwnedVideoPublication {
    isDisabled() {
        return !!this.payload.VideoBlacklist || (this.payload.waitTranscoding && this.payload.state !== VideoState.PUBLISHED);
    }
}
//# sourceMappingURL=owned-publication-after-schedule-update.js.map