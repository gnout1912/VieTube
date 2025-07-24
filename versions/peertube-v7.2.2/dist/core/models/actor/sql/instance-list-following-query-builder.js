import { ModelBuilder } from '../../shared/index.js';
import { parseRowCountResult } from '../../shared/index.js';
import { InstanceListFollowsQueryBuilder } from './shared/instance-list-follows-query-builder.js';
export class InstanceListFollowingQueryBuilder extends InstanceListFollowsQueryBuilder {
    constructor(sequelize, options) {
        super(sequelize, options);
        this.sequelize = sequelize;
        this.options = options;
    }
    async listFollowing() {
        this.buildListQuery();
        const results = await this.runQuery({ nest: true });
        const modelBuilder = new ModelBuilder(this.sequelize);
        return modelBuilder.createModels(results, 'ActorFollow');
    }
    async countFollowing() {
        this.buildCountQuery();
        const result = await this.runQuery();
        return parseRowCountResult(result);
    }
    getWhere() {
        let where = 'WHERE "ActorFollowModel"."actorId" = :followerId ';
        this.replacements.followerId = this.options.followerId;
        if (this.options.state) {
            where += 'AND "ActorFollowModel"."state" = :state ';
            this.replacements.state = this.options.state;
        }
        if (this.options.search) {
            const escapedLikeSearch = this.sequelize.escape('%' + this.options.search + '%');
            where += `AND (` +
                `"ActorFollowing->Server"."host" ILIKE ${escapedLikeSearch} ` +
                `OR "ActorFollowing"."preferredUsername" ILIKE ${escapedLikeSearch} ` +
                `)`;
        }
        if (this.options.actorType) {
            where += `AND "ActorFollowing"."type" = :actorType `;
            this.replacements.actorType = this.options.actorType;
        }
        return where;
    }
}
//# sourceMappingURL=instance-list-following-query-builder.js.map