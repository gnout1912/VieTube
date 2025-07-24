import { AbstractOwnedVideoPublication } from './abstract-owned-video-publication.js';
export class OwnedPublicationAfterTranscoding extends AbstractOwnedVideoPublication {
    isDisabled() {
        return !this.payload.waitTranscoding || !!this.payload.VideoBlacklist || !!this.payload.ScheduleVideoUpdate;
    }
}
//# sourceMappingURL=owned-publication-after-transcoding.js.map