import { pick } from '@peertube/peertube-core-utils';
import { AbstractVideoQueryBuilder } from './shared/abstract-video-query-builder.js';
import { VideoFileQueryBuilder } from './shared/video-file-query-builder.js';
import { VideoModelBuilder } from './shared/video-model-builder.js';
import { VideoTableAttributes } from './shared/video-table-attributes.js';
export class VideoModelGetQueryBuilder {
    constructor(sequelize) {
        this.sequelize = sequelize;
        this.videoQueryBuilder = new VideosModelGetQuerySubBuilder(sequelize);
        this.webVideoFilesQueryBuilder = new VideoFileQueryBuilder(sequelize);
        this.streamingPlaylistFilesQueryBuilder = new VideoFileQueryBuilder(sequelize);
        this.videoModelBuilder = new VideoModelBuilder('get', new VideoTableAttributes('get'));
    }
    async queryVideo(options) {
        const fileQueryOptions = Object.assign(Object.assign({}, pick(options, ['id', 'url', 'transaction', 'logging'])), { includeRedundancy: this.shouldIncludeRedundancies(options) });
        const [videoRows, webVideoFilesRows, streamingPlaylistFilesRows] = await Promise.all([
            this.videoQueryBuilder.queryVideos(options),
            VideoModelGetQueryBuilder.videoFilesInclude.has(options.type)
                ? this.webVideoFilesQueryBuilder.queryWebVideos(fileQueryOptions)
                : Promise.resolve(undefined),
            VideoModelGetQueryBuilder.videoFilesInclude.has(options.type)
                ? this.streamingPlaylistFilesQueryBuilder.queryStreamingPlaylistVideos(fileQueryOptions)
                : Promise.resolve(undefined)
        ]);
        const videos = this.videoModelBuilder.buildVideosFromRows({
            rows: videoRows,
            rowsWebVideoFiles: webVideoFilesRows,
            rowsStreamingPlaylist: streamingPlaylistFilesRows
        });
        if (videos.length > 1) {
            throw new Error('Video results is more than 1');
        }
        if (videos.length === 0)
            return null;
        return videos[0];
    }
    shouldIncludeRedundancies(options) {
        return options.type === 'api';
    }
}
VideoModelGetQueryBuilder.videoFilesInclude = new Set(['api', 'full', 'account-blacklist-files', 'all-files']);
export class VideosModelGetQuerySubBuilder extends AbstractVideoQueryBuilder {
    constructor(sequelize) {
        super(sequelize, 'get');
        this.sequelize = sequelize;
    }
    queryVideos(options) {
        this.buildMainGetQuery(options);
        return this.runQuery(options);
    }
    buildMainGetQuery(options) {
        this.attributes = {
            '"video".*': ''
        };
        if (VideosModelGetQuerySubBuilder.thumbnailsInclude.has(options.type)) {
            this.includeThumbnails();
        }
        if (VideosModelGetQuerySubBuilder.blacklistedInclude.has(options.type)) {
            this.includeBlacklisted();
        }
        if (VideosModelGetQuerySubBuilder.accountInclude.has(options.type)) {
            this.includeChannels();
            this.includeAccounts();
        }
        if (VideosModelGetQuerySubBuilder.tagsInclude.has(options.type)) {
            this.includeTags();
        }
        if (VideosModelGetQuerySubBuilder.scheduleUpdateInclude.has(options.type)) {
            this.includeScheduleUpdate();
        }
        if (VideosModelGetQuerySubBuilder.liveInclude.has(options.type)) {
            this.includeLive();
        }
        if (options.userId && VideosModelGetQuerySubBuilder.userHistoryInclude.has(options.type)) {
            this.includeUserHistory(options.userId);
        }
        if (VideosModelGetQuerySubBuilder.ownerUserInclude.has(options.type)) {
            this.includeOwnerUser();
        }
        if (VideosModelGetQuerySubBuilder.trackersInclude.has(options.type)) {
            this.includeTrackers();
        }
        this.whereId(options);
        this.query = this.buildQuery(options);
    }
    buildQuery(options) {
        const order = VideosModelGetQuerySubBuilder.tagsInclude.has(options.type)
            ? 'ORDER BY "Tags"."name" ASC'
            : '';
        const from = `SELECT * FROM "video" ${this.where} LIMIT 1`;
        return `${this.buildSelect()} FROM (${from}) AS "video" ${this.joins} ${order}`;
    }
}
VideosModelGetQuerySubBuilder.trackersInclude = new Set(['api']);
VideosModelGetQuerySubBuilder.liveInclude = new Set(['api', 'full']);
VideosModelGetQuerySubBuilder.scheduleUpdateInclude = new Set(['api', 'full']);
VideosModelGetQuerySubBuilder.tagsInclude = new Set(['api', 'full']);
VideosModelGetQuerySubBuilder.userHistoryInclude = new Set(['api', 'full']);
VideosModelGetQuerySubBuilder.accountInclude = new Set(['api', 'full', 'account', 'account-blacklist-files']);
VideosModelGetQuerySubBuilder.ownerUserInclude = new Set(['blacklist-rights']);
VideosModelGetQuerySubBuilder.blacklistedInclude = new Set([
    'api',
    'full',
    'account-blacklist-files',
    'thumbnails-blacklist',
    'blacklist-rights'
]);
VideosModelGetQuerySubBuilder.thumbnailsInclude = new Set([
    'api',
    'full',
    'account-blacklist-files',
    'all-files',
    'thumbnails',
    'thumbnails-blacklist'
]);
//# sourceMappingURL=video-model-get-query-builder.js.map