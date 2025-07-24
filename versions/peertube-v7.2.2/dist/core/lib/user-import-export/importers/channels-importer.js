import { ActorImageType } from '@peertube/peertube-models';
import { logger, loggerTagsFactory } from '../../../helpers/logger.js';
import { pick } from '@peertube/peertube-core-utils';
import { AbstractUserImporter } from './abstract-user-importer.js';
import { sequelizeTypescript } from '../../../initializers/database.js';
import { createLocalVideoChannelWithoutKeys } from '../../video-channel.js';
import { JobQueue } from '../../job-queue/job-queue.js';
import { updateLocalActorImageFiles } from '../../local-actor.js';
import { VideoChannelModel } from '../../../models/video/video-channel.js';
import { isVideoChannelDescriptionValid, isVideoChannelDisplayNameValid, isVideoChannelSupportValid, isVideoChannelUsernameValid } from '../../../helpers/custom-validators/video-channels.js';
import { CONSTRAINTS_FIELDS } from '../../../initializers/constants.js';
const lTags = loggerTagsFactory('user-import');
export class ChannelsImporter extends AbstractUserImporter {
    getImportObjects(json) {
        return json.channels;
    }
    sanitize(channelImportData) {
        if (!isVideoChannelUsernameValid(channelImportData.name))
            return undefined;
        if (!isVideoChannelDisplayNameValid(channelImportData.displayName))
            return undefined;
        if (!isVideoChannelDescriptionValid(channelImportData.description))
            channelImportData.description = null;
        if (!isVideoChannelSupportValid(channelImportData.support))
            channelImportData.support = null;
        return pick(channelImportData, ['name', 'displayName', 'description', 'support', 'archiveFiles']);
    }
    async importObject(channelImportData) {
        const account = this.user.Account;
        const existingChannel = await VideoChannelModel.loadLocalByNameAndPopulateAccount(channelImportData.name);
        if (existingChannel) {
            logger.info(`Do not import channel ${existingChannel.name} that already exists on this PeerTube instance`, lTags());
        }
        else {
            const videoChannelCreated = await sequelizeTypescript.transaction(async (t) => {
                return createLocalVideoChannelWithoutKeys(pick(channelImportData, ['displayName', 'name', 'description', 'support']), account, t);
            });
            await JobQueue.Instance.createJob({ type: 'actor-keys', payload: { actorId: videoChannelCreated.actorId } });
            for (const type of [ActorImageType.AVATAR, ActorImageType.BANNER]) {
                const relativePath = type === ActorImageType.AVATAR
                    ? channelImportData.archiveFiles.avatar
                    : channelImportData.archiveFiles.banner;
                if (!relativePath)
                    continue;
                const absolutePath = this.getSafeArchivePathOrThrow(relativePath);
                if (!await this.isFileValidOrLog(absolutePath, CONSTRAINTS_FIELDS.ACTORS.IMAGE.FILE_SIZE.max))
                    continue;
                await updateLocalActorImageFiles({
                    accountOrChannel: videoChannelCreated,
                    imagePhysicalFile: { path: absolutePath },
                    type,
                    sendActorUpdate: false
                });
            }
            logger.info('Video channel %s imported.', channelImportData.name, lTags());
        }
        return {
            duplicate: !!existingChannel
        };
    }
}
//# sourceMappingURL=channels-importer.js.map