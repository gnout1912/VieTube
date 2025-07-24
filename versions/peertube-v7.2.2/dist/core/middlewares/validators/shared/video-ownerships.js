import { VideoChangeOwnershipModel } from '../../../models/video/video-change-ownership.js';
import { forceNumber } from '@peertube/peertube-core-utils';
import { HttpStatusCode } from '@peertube/peertube-models';
async function doesChangeVideoOwnershipExist(idArg, res) {
    const id = forceNumber(idArg);
    const videoChangeOwnership = await VideoChangeOwnershipModel.load(id);
    if (!videoChangeOwnership) {
        res.fail({
            status: HttpStatusCode.NOT_FOUND_404,
            message: 'Video change ownership not found'
        });
        return false;
    }
    res.locals.videoChangeOwnership = videoChangeOwnership;
    return true;
}
export { doesChangeVideoOwnershipExist };
//# sourceMappingURL=video-ownerships.js.map