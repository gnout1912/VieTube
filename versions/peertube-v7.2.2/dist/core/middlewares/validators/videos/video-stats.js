import { param, query } from 'express-validator';
import { isDateValid } from '../../../helpers/custom-validators/misc.js';
import { isValidStatTimeserieMetric } from '../../../helpers/custom-validators/video-stats.js';
import { STATS_TIMESERIE } from '../../../initializers/constants.js';
import { HttpStatusCode, UserRight } from '@peertube/peertube-models';
import { areValidationErrors, checkUserCanManageVideo, doesVideoExist, isValidVideoIdParam } from '../shared/index.js';
export const videoOverallOrUserAgentStatsValidator = [
    isValidVideoIdParam('videoId'),
    query('startDate')
        .optional()
        .custom(isDateValid),
    query('endDate')
        .optional()
        .custom(isDateValid),
    async (req, res, next) => {
        if (areValidationErrors(req, res))
            return;
        if (!await commonStatsCheck(req, res))
            return;
        return next();
    }
];
export const videoRetentionStatsValidator = [
    isValidVideoIdParam('videoId'),
    async (req, res, next) => {
        if (areValidationErrors(req, res))
            return;
        if (!await commonStatsCheck(req, res))
            return;
        if (res.locals.videoAll.isLive) {
            return res.fail({
                status: HttpStatusCode.BAD_REQUEST_400,
                message: 'Cannot get retention stats of live video'
            });
        }
        return next();
    }
];
export const videoTimeseriesStatsValidator = [
    isValidVideoIdParam('videoId'),
    param('metric')
        .custom(isValidStatTimeserieMetric),
    query('startDate')
        .optional()
        .custom(isDateValid),
    query('endDate')
        .optional()
        .custom(isDateValid),
    async (req, res, next) => {
        if (areValidationErrors(req, res))
            return;
        if (!await commonStatsCheck(req, res))
            return;
        const query = req.query;
        if ((query.startDate && !query.endDate) ||
            (!query.startDate && query.endDate)) {
            return res.fail({
                status: HttpStatusCode.BAD_REQUEST_400,
                message: 'Both start date and end date should be defined if one of them is specified'
            });
        }
        if (query.startDate && getIntervalByDays(query.startDate, query.endDate) > STATS_TIMESERIE.MAX_DAYS) {
            return res.fail({
                status: HttpStatusCode.BAD_REQUEST_400,
                message: 'Star date and end date interval is too big'
            });
        }
        return next();
    }
];
async function commonStatsCheck(req, res) {
    if (!await doesVideoExist(req.params.videoId, res, 'all'))
        return false;
    if (!checkUserCanManageVideo(res.locals.oauth.token.User, res.locals.videoAll, UserRight.SEE_ALL_VIDEOS, res))
        return false;
    return true;
}
function getIntervalByDays(startDateString, endDateString) {
    const startDate = new Date(startDateString);
    const endDate = new Date(endDateString);
    return (endDate.getTime() - startDate.getTime()) / 1000 / 86400;
}
//# sourceMappingURL=video-stats.js.map