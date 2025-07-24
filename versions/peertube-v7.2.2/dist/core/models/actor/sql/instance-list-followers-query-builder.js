import { ModelBuilder } from '../../shared/index.js';
import { parseRowCountResult } from '../../shared/index.js';
import { InstanceListFollowsQueryBuilder } from './shared/instance-list-follows-query-builder.js';
export class InstanceListFollowersQueryBuilder extends InstanceListFollowsQueryBuilder {
    constructor(sequelize, options) {
        super(sequelize, options);
        this.sequelize = sequelize;
        this.options = options;
    }
    async listFollowers() {
        this.buildListQuery();
        const results = await this.runQuery({ nest: true });
        const modelBuilder = new ModelBuilder(this.sequelize);
        return modelBuilder.createModels(results, 'ActorFollow');
    }
    async countFollowers() {
        this.buildCountQuery();
        const result = await this.runQuery();
        return parseRowCountResult(result);
    }
    getWhere() {
        let where = 'WHERE "ActorFollowing"."id" IN (:actorIds) ';
        this.replacements.actorIds = this.options.actorIds;
        if (this.options.state) {
            where += 'AND "ActorFollowModel"."state" = :state ';
            this.replacements.state = this.options.state;
        }
        if (this.options.search) {
            const escapedLikeSearch = this.sequelize.escape('%' + this.options.search + '%');
            where += `AND (` +
                `"ActorFollower->Server"."host" ILIKE ${escapedLikeSearch} ` +
                `OR "ActorFollower"."preferredUsername" ILIKE ${escapedLikeSearch} ` +
                `)`;
        }
        if (this.options.actorType) {
            where += `AND "ActorFollower"."type" = :actorType `;
            this.replacements.actorType = this.options.actorType;
        }
        return where;
    }
}
//# sourceMappingURL=instance-list-followers-query-builder.js.map