import { VIDEO_RATE_TYPES } from '../initializers/constants.js';
import { sequelizeTypescript } from '../initializers/database.js';
import { AccountVideoRateModel } from '../models/account/account-video-rate.js';
import { AccountModel } from '../models/account/account.js';
import { getLocalRateUrl, sendVideoRateChange } from './activitypub/video-rates.js';
export async function userRateVideo(options) {
    const { account, rateType, video } = options;
    await sequelizeTypescript.transaction(async (t) => {
        const sequelizeOptions = { transaction: t };
        const accountInstance = await AccountModel.load(account.id, t);
        const previousRate = await AccountVideoRateModel.load(accountInstance.id, video.id, t);
        if (rateType === 'none' && !previousRate || (previousRate === null || previousRate === void 0 ? void 0 : previousRate.type) === rateType)
            return;
        let likesToIncrement = 0;
        let dislikesToIncrement = 0;
        if (rateType === VIDEO_RATE_TYPES.LIKE)
            likesToIncrement++;
        else if (rateType === VIDEO_RATE_TYPES.DISLIKE)
            dislikesToIncrement++;
        if (previousRate) {
            if (previousRate.type === 'like')
                likesToIncrement--;
            else if (previousRate.type === 'dislike')
                dislikesToIncrement--;
            if (rateType === 'none') {
                await previousRate.destroy(sequelizeOptions);
            }
            else {
                previousRate.type = rateType;
                previousRate.url = getLocalRateUrl(rateType, account.Actor, video);
                await previousRate.save(sequelizeOptions);
            }
        }
        else if (rateType !== 'none') {
            const query = {
                accountId: accountInstance.id,
                videoId: video.id,
                type: rateType,
                url: getLocalRateUrl(rateType, account.Actor, video)
            };
            await AccountVideoRateModel.create(query, sequelizeOptions);
        }
        const incrementQuery = {
            likes: likesToIncrement,
            dislikes: dislikesToIncrement
        };
        await video.increment(incrementQuery, sequelizeOptions);
        await sendVideoRateChange(accountInstance, video, likesToIncrement, dislikesToIncrement, t);
    });
}
//# sourceMappingURL=rate.js.map