import { forceNumber } from '@peertube/peertube-core-utils';
import { VideoPrivacy, VideoState } from '@peertube/peertube-models';
import { CONFIG } from '../../../initializers/config.js';
import { sendCreateVideo, sendUpdateVideo } from '../send/index.js';
import { shareByServer, shareByVideoChannel } from '../share.js';
export async function federateVideoIfNeeded(videoArg, isNewVideo, transaction) {
    if (!canVideoBeFederated(videoArg, isNewVideo))
        return;
    const video = await videoArg.lightAPToFullAP(transaction);
    if (isNewVideo) {
        await sendCreateVideo(video, transaction);
        await Promise.all([
            shareByServer(video, transaction),
            shareByVideoChannel(video, transaction)
        ]);
    }
    else {
        await sendUpdateVideo(video, transaction);
    }
}
export function canVideoBeFederated(video, isNewVideo = false) {
    if (video.isBlacklisted() === true) {
        if (isNewVideo === false)
            return false;
        if (video.VideoBlacklist.unfederated === true)
            return false;
    }
    return isPrivacyForFederation(video.privacy) && isStateForFederation(video.state);
}
export function isNewVideoPrivacyForFederation(currentPrivacy, newPrivacy) {
    return !isPrivacyForFederation(currentPrivacy) && isPrivacyForFederation(newPrivacy);
}
export function isPrivacyForFederation(privacy) {
    const castedPrivacy = forceNumber(privacy);
    return castedPrivacy === VideoPrivacy.PUBLIC ||
        (CONFIG.FEDERATION.VIDEOS.FEDERATE_UNLISTED === true && castedPrivacy === VideoPrivacy.UNLISTED);
}
export function isStateForFederation(state) {
    const castedState = forceNumber(state);
    return castedState === VideoState.PUBLISHED || castedState === VideoState.WAITING_FOR_LIVE || castedState === VideoState.LIVE_ENDED;
}
//# sourceMappingURL=federate.js.map