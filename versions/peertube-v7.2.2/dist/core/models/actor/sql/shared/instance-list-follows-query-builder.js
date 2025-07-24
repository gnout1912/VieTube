import { AbstractRunQuery } from '../../../shared/index.js';
import { ActorImageType } from '@peertube/peertube-models';
import { getInstanceFollowsSort } from '../../../shared/index.js';
import { ActorFollowTableAttributes } from './actor-follow-table-attributes.js';
export class InstanceListFollowsQueryBuilder extends AbstractRunQuery {
    constructor(sequelize, options) {
        super(sequelize);
        this.sequelize = sequelize;
        this.options = options;
        this.tableAttributes = new ActorFollowTableAttributes();
    }
    getJoins() {
        return 'INNER JOIN "actor" "ActorFollower" ON "ActorFollower"."id" = "ActorFollowModel"."actorId" ' +
            'INNER JOIN "actor" "ActorFollowing" ON "ActorFollowing"."id" = "ActorFollowModel"."targetActorId" ';
    }
    getServerJoin(actorName) {
        return `LEFT JOIN "server" "${actorName}->Server" ON "${actorName}"."serverId" = "${actorName}->Server"."id" `;
    }
    getAvatarsJoin(actorName) {
        return `LEFT JOIN "actorImage" "${actorName}->Avatars" ON "${actorName}.id" = "${actorName}->Avatars"."actorId" ` +
            `AND "${actorName}->Avatars"."type" = ${ActorImageType.AVATAR}`;
    }
    buildInnerQuery() {
        this.innerQuery = `${this.getInnerSelect()} ` +
            `FROM "actorFollow" AS "ActorFollowModel" ` +
            `${this.getJoins()} ` +
            `${this.getServerJoin('ActorFollowing')} ` +
            `${this.getServerJoin('ActorFollower')} ` +
            `${this.getWhere()} ` +
            `${this.getOrder()} ` +
            `LIMIT :limit OFFSET :offset `;
        this.replacements.limit = this.options.count;
        this.replacements.offset = this.options.start;
    }
    buildListQuery() {
        this.buildInnerQuery();
        this.query = `${this.getSelect()} ` +
            `FROM (${this.innerQuery}) AS "ActorFollowModel" ` +
            `${this.getAvatarsJoin('ActorFollower')} ` +
            `${this.getAvatarsJoin('ActorFollowing')} ` +
            `${this.getOrder()}`;
    }
    buildCountQuery() {
        this.query = `SELECT COUNT(*) AS "total" ` +
            `FROM "actorFollow" AS "ActorFollowModel" ` +
            `${this.getJoins()} ` +
            `${this.getServerJoin('ActorFollowing')} ` +
            `${this.getServerJoin('ActorFollower')} ` +
            `${this.getWhere()}`;
    }
    getInnerSelect() {
        return this.buildSelect([
            this.tableAttributes.getFollowAttributes(),
            this.tableAttributes.getActorAttributes('ActorFollower'),
            this.tableAttributes.getActorAttributes('ActorFollowing'),
            this.tableAttributes.getServerAttributes('ActorFollower'),
            this.tableAttributes.getServerAttributes('ActorFollowing')
        ]);
    }
    getSelect() {
        return this.buildSelect([
            '"ActorFollowModel".*',
            this.tableAttributes.getAvatarAttributes('ActorFollower'),
            this.tableAttributes.getAvatarAttributes('ActorFollowing')
        ]);
    }
    getOrder() {
        const orders = getInstanceFollowsSort(this.options.sort);
        return 'ORDER BY ' + orders.map(o => `"${o[0]}" ${o[1]}`).join(', ');
    }
}
//# sourceMappingURL=instance-list-follows-query-builder.js.map