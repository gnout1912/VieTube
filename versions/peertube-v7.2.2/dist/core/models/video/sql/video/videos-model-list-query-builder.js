import { pick } from '@peertube/peertube-core-utils';
import { VideoInclude } from '@peertube/peertube-models';
import { AbstractVideoQueryBuilder } from './shared/abstract-video-query-builder.js';
import { VideoFileQueryBuilder } from './shared/video-file-query-builder.js';
import { VideoModelBuilder } from './shared/video-model-builder.js';
import { VideosIdListQueryBuilder } from './videos-id-list-query-builder.js';
import { getServerActor } from '../../../application/application.js';
export class VideosModelListQueryBuilder extends AbstractVideoQueryBuilder {
    constructor(sequelize) {
        super(sequelize, 'list');
        this.sequelize = sequelize;
        this.videoModelBuilder = new VideoModelBuilder(this.mode, this.tables);
        this.webVideoFilesQueryBuilder = new VideoFileQueryBuilder(sequelize);
        this.streamingPlaylistFilesQueryBuilder = new VideoFileQueryBuilder(sequelize);
    }
    async queryVideos(options) {
        const serverActor = await getServerActor();
        this.buildInnerQuery(options);
        this.buildMainQuery(options, serverActor);
        const rows = await this.runQuery();
        if (options.include & VideoInclude.FILES) {
            const videoIds = Array.from(new Set(rows.map(r => r.id)));
            if (videoIds.length !== 0) {
                const fileQueryOptions = Object.assign(Object.assign({}, pick(options, ['transaction', 'logging'])), { ids: videoIds, includeRedundancy: false });
                const [rowsWebVideoFiles, rowsStreamingPlaylist] = await Promise.all([
                    this.webVideoFilesQueryBuilder.queryWebVideos(fileQueryOptions),
                    this.streamingPlaylistFilesQueryBuilder.queryStreamingPlaylistVideos(fileQueryOptions)
                ]);
                return this.videoModelBuilder.buildVideosFromRows({ rows, include: options.include, rowsStreamingPlaylist, rowsWebVideoFiles });
            }
        }
        return this.videoModelBuilder.buildVideosFromRows({ rows, include: options.include });
    }
    buildInnerQuery(options) {
        const idsQueryBuilder = new VideosIdListQueryBuilder(this.sequelize);
        const { query, sort, replacements, queryConfig } = idsQueryBuilder.getQuery(options);
        this.replacements = replacements;
        this.innerQuery = query;
        this.innerSort = sort;
        this.queryConfig = queryConfig;
    }
    buildMainQuery(options, serverActor) {
        this.attributes = {
            '"video".*': ''
        };
        this.addJoin('INNER JOIN "video" ON "tmp"."id" = "video"."id"');
        this.includeChannels();
        this.includeAccounts();
        this.includeThumbnails();
        if (options.user) {
            this.includeUserHistory(options.user.id);
        }
        if (options.videoPlaylistId) {
            this.includePlaylist(options.videoPlaylistId);
        }
        if (options.include & VideoInclude.BLACKLISTED) {
            this.includeBlacklisted();
        }
        if (options.include & VideoInclude.BLOCKED_OWNER) {
            this.includeBlockedOwnerAndServer(options.serverAccountIdForBlock, options.user);
        }
        if (options.include & VideoInclude.SOURCE) {
            this.includeVideoSource();
        }
        if (options.include & VideoInclude.AUTOMATIC_TAGS) {
            this.includeAutomaticTags(serverActor.Account.id);
        }
        if (options.include & VideoInclude.TAGS) {
            this.includeTags();
        }
        if (options.include & VideoInclude.NOT_PUBLISHED_STATE) {
            this.includeScheduleUpdate();
        }
        const select = this.buildSelect();
        this.query = `${select} FROM (${this.innerQuery}) AS "tmp" ${this.joins} ${this.innerSort}`;
    }
}
//# sourceMappingURL=videos-model-list-query-builder.js.map