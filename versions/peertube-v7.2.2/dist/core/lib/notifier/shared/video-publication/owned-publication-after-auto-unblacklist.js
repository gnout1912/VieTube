import { VideoState } from '@peertube/peertube-models';
import { AbstractOwnedVideoPublication } from './abstract-owned-video-publication.js';
export class OwnedPublicationAfterAutoUnblacklist extends AbstractOwnedVideoPublication {
    isDisabled() {
        return !!this.payload.ScheduleVideoUpdate || (this.payload.waitTranscoding && this.payload.state !== VideoState.PUBLISHED);
    }
}
//# sourceMappingURL=owned-publication-after-auto-unblacklist.js.map