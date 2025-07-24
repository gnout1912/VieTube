import { logger } from '../../../helpers/logger.js';
import { VideoChannelModel } from '../../../models/video/video-channel.js';
import { ActorExporter } from './actor-exporter.js';
export class ChannelsExporter extends ActorExporter {
    async export() {
        const channelsJSON = [];
        let staticFiles = [];
        const channels = await VideoChannelModel.listAllByAccount(this.user.Account.id);
        for (const channel of channels) {
            try {
                const exported = await this.exportChannel(channel.id);
                channelsJSON.push(exported.json);
                staticFiles = staticFiles.concat(exported.staticFiles);
            }
            catch (err) {
                logger.warn('Cannot export channel %s.', channel.name, { err });
            }
        }
        return {
            json: { channels: channelsJSON },
            staticFiles
        };
    }
    async exportChannel(channelId) {
        const channel = await VideoChannelModel.loadAndPopulateAccount(channelId);
        const { relativePathsFromJSON, staticFiles } = this.exportActorFiles(channel.Actor);
        return {
            json: this.exportChannelJSON(channel, relativePathsFromJSON),
            staticFiles
        };
    }
    exportChannelJSON(channel, archiveFiles) {
        return Object.assign(Object.assign({}, this.exportActorJSON(channel.Actor)), { displayName: channel.getDisplayName(), description: channel.description, support: channel.support, updatedAt: channel.updatedAt.toISOString(), createdAt: channel.createdAt.toISOString(), archiveFiles });
    }
}
//# sourceMappingURL=channels-exporter.js.map