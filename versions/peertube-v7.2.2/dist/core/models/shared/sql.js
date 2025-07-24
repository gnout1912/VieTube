import { forceNumber } from '@peertube/peertube-core-utils';
import { literal } from 'sequelize';
export function buildLocalAccountIdsIn() {
    return literal('(SELECT "account"."id" FROM "account" INNER JOIN "actor" ON "actor"."id" = "account"."actorId" AND "actor"."serverId" IS NULL)');
}
export function buildLocalActorIdsIn() {
    return literal('(SELECT "actor"."id" FROM "actor" WHERE "actor"."serverId" IS NULL)');
}
export function buildBlockedAccountSQL(blockerIds) {
    const blockerIdsString = blockerIds.join(', ');
    return 'SELECT "targetAccountId" AS "id" FROM "accountBlocklist" WHERE "accountId" IN (' + blockerIdsString + ')' +
        ' UNION ' +
        'SELECT "account"."id" AS "id" FROM account INNER JOIN "actor" ON account."actorId" = actor.id ' +
        'INNER JOIN "serverBlocklist" ON "actor"."serverId" = "serverBlocklist"."targetServerId" ' +
        'WHERE "serverBlocklist"."accountId" IN (' + blockerIdsString + ')';
}
export function buildServerIdsFollowedBy(actorId) {
    const actorIdNumber = forceNumber(actorId);
    const followState = 'accepted';
    return '(' +
        'SELECT "actor"."serverId" FROM "actorFollow" ' +
        'INNER JOIN "actor" ON actor.id = "actorFollow"."targetActorId" ' +
        `WHERE "actorFollow"."actorId" = ${actorIdNumber} AND "actorFollow"."state" = '${followState}'` +
        ')';
}
export function buildSQLAttributes(options) {
    const { model, tableName, aliasPrefix = '', excludeAttributes, idBuilder } = options;
    const attributes = Object.keys(model.getAttributes());
    const builtAttributes = attributes
        .filter(a => {
        if (!excludeAttributes)
            return true;
        if (excludeAttributes.includes(a))
            return false;
        return true;
    })
        .map(a => {
        return `"${tableName}"."${a}" AS "${aliasPrefix}${a}"`;
    });
    if (idBuilder) {
        const idSelect = idBuilder.map(a => `"${tableName}"."${a}"`)
            .join(` || '-' || `);
        builtAttributes.push(`${idSelect} AS "${aliasPrefix}id"`);
    }
    return builtAttributes;
}
//# sourceMappingURL=sql.js.map