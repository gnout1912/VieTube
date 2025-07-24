import { AbuseModel } from '../../../models/abuse/abuse.js';
import { HttpStatusCode } from '@peertube/peertube-models';
import { forceNumber } from '@peertube/peertube-core-utils';
async function doesAbuseExist(abuseId, res) {
    const abuse = await AbuseModel.loadByIdWithReporter(forceNumber(abuseId));
    if (!abuse) {
        res.fail({
            status: HttpStatusCode.NOT_FOUND_404,
            message: 'Abuse not found'
        });
        return false;
    }
    res.locals.abuse = abuse;
    return true;
}
export { doesAbuseExist };
//# sourceMappingURL=abuses.js.map