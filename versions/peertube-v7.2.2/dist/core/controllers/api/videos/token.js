import express from 'express';
import { VideoTokensManager } from '../../../lib/video-tokens-manager.js';
import { VideoPrivacy } from '@peertube/peertube-models';
import { asyncMiddleware, optionalAuthenticate, videoFileTokenValidator, videosCustomGetValidator } from '../../../middlewares/index.js';
const tokenRouter = express.Router();
tokenRouter.post('/:id/token', optionalAuthenticate, asyncMiddleware(videosCustomGetValidator('only-video-and-blacklist')), videoFileTokenValidator, generateToken);
export { tokenRouter };
function generateToken(req, res) {
    const video = res.locals.onlyVideo;
    const files = video.privacy === VideoPrivacy.PASSWORD_PROTECTED
        ? VideoTokensManager.Instance.createForPasswordProtectedVideo({ videoUUID: video.uuid })
        : VideoTokensManager.Instance.createForAuthUser({ videoUUID: video.uuid, user: res.locals.oauth.token.User });
    return res.json({
        files
    });
}
//# sourceMappingURL=token.js.map