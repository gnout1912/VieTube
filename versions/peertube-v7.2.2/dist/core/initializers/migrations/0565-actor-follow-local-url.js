async function up(utils) {
    {
        const query = `
    UPDATE "actorFollow" SET url = follower.url || '/follows/' || following.id
    FROM actor follower, actor following
    WHERE follower."serverId" IS NULL AND follower.id = "actorFollow"."actorId" AND following.id = "actorFollow"."targetActorId"
    `;
        await utils.sequelize.query(query);
    }
}
function down(options) {
    throw new Error('Not implemented.');
}
export { up, down };
//# sourceMappingURL=0565-actor-follow-local-url.js.map