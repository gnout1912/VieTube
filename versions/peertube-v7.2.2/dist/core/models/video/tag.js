var TagModel_1;
import { __decorate, __metadata } from "tslib";
import { VideoPrivacy, VideoState } from '@peertube/peertube-models';
import { QueryTypes, col, fn } from 'sequelize';
import { AllowNull, BelongsToMany, Column, Is, Table } from 'sequelize-typescript';
import { isVideoTagValid } from '../../helpers/custom-validators/videos.js';
import { SequelizeModel, throwIfNotValid } from '../shared/index.js';
import { VideoTagModel } from './video-tag.js';
import { VideoModel } from './video.js';
let TagModel = TagModel_1 = class TagModel extends SequelizeModel {
    static getRandomSamples(threshold, count) {
        const query = 'SELECT tag.name FROM tag ' +
            'INNER JOIN "videoTag" ON "videoTag"."tagId" = tag.id ' +
            'INNER JOIN video ON video.id = "videoTag"."videoId" ' +
            'WHERE video.privacy = $videoPrivacy AND video.state = $videoState ' +
            'GROUP BY tag.name HAVING COUNT(tag.name) >= $threshold ' +
            'ORDER BY random() ' +
            'LIMIT $count';
        const options = {
            bind: { threshold, count, videoPrivacy: VideoPrivacy.PUBLIC, videoState: VideoState.PUBLISHED },
            type: QueryTypes.SELECT
        };
        return TagModel_1.sequelize.query(query, options)
            .then(data => data.map(d => d.name));
    }
    static findOrCreateMultiple(options) {
        const { tags, transaction } = options;
        if (tags === null)
            return Promise.resolve([]);
        const uniqueTags = new Set(tags);
        const tasks = Array.from(uniqueTags).map(tag => {
            const query = {
                where: {
                    name: tag
                },
                defaults: {
                    name: tag
                },
                transaction
            };
            return this.findOrCreate(query)
                .then(([tagInstance]) => tagInstance);
        });
        return Promise.all(tasks);
    }
};
__decorate([
    AllowNull(false),
    Is('VideoTag', value => throwIfNotValid(value, isVideoTagValid, 'tag')),
    Column,
    __metadata("design:type", String)
], TagModel.prototype, "name", void 0);
__decorate([
    BelongsToMany(() => VideoModel, {
        foreignKey: 'tagId',
        through: () => VideoTagModel,
        onDelete: 'CASCADE'
    }),
    __metadata("design:type", Array)
], TagModel.prototype, "Videos", void 0);
TagModel = TagModel_1 = __decorate([
    Table({
        tableName: 'tag',
        timestamps: false,
        indexes: [
            {
                fields: ['name'],
                unique: true
            },
            {
                name: 'tag_lower_name',
                fields: [fn('lower', col('name'))]
            }
        ]
    })
], TagModel);
export { TagModel };
//# sourceMappingURL=tag.js.map