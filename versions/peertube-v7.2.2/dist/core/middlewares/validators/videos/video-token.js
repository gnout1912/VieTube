import { HttpStatusCode, VideoPrivacy } from '@peertube/peertube-models';
import { exists } from '../../../helpers/custom-validators/misc.js';
const videoFileTokenValidator = [
    (req, res, next) => {
        const video = res.locals.onlyVideo;
        if (video.privacy !== VideoPrivacy.PASSWORD_PROTECTED && !exists(res.locals.oauth.token.User)) {
            return res.fail({
                status: HttpStatusCode.UNAUTHORIZED_401,
                message: 'Not authenticated'
            });
        }
        return next();
    }
];
export { videoFileTokenValidator };
//# sourceMappingURL=video-token.js.map