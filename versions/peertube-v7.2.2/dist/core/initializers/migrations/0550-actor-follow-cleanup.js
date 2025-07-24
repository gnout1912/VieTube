async function up(utils) {
    const query = `
    WITH t AS (
      SELECT actor.id FROM actor
      LEFT JOIN "videoChannel" ON "videoChannel"."actorId" = actor.id
      LEFT JOIN account ON account."actorId" = "actor"."id"
      WHERE "videoChannel".id IS NULL and "account".id IS NULL
    ) DELETE FROM "actorFollow" WHERE "actorId" IN (SELECT t.id FROM t) OR "targetActorId" in (SELECT t.id FROM t)
  `;
    await utils.sequelize.query(query);
}
function down(options) {
    throw new Error('Not implemented.');
}
export { up, down };
//# sourceMappingURL=0550-actor-follow-cleanup.js.map