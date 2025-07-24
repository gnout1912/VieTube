import { AbstractVideoQueryBuilder } from './abstract-video-query-builder.js';
export class VideoFileQueryBuilder extends AbstractVideoQueryBuilder {
    constructor(sequelize) {
        super(sequelize, 'get');
        this.sequelize = sequelize;
    }
    queryWebVideos(options) {
        this.buildWebVideoFilesQuery(options);
        return this.runQuery(options);
    }
    queryStreamingPlaylistVideos(options) {
        this.buildVideoStreamingPlaylistFilesQuery(options);
        return this.runQuery(options);
    }
    buildWebVideoFilesQuery(options) {
        this.attributes = {
            '"video"."id"': ''
        };
        this.includeWebVideoFiles();
        this.whereId(options);
        this.query = this.buildQuery();
    }
    buildVideoStreamingPlaylistFilesQuery(options) {
        this.attributes = {
            '"video"."id"': ''
        };
        this.includeStreamingPlaylistFiles();
        if (options.includeRedundancy) {
            this.includeStreamingPlaylistRedundancies();
        }
        this.whereId(options);
        this.query = this.buildQuery();
    }
    buildQuery() {
        return `${this.buildSelect()} FROM "video" ${this.joins} ${this.where}`;
    }
}
//# sourceMappingURL=video-file-query-builder.js.map