async function up(utils) {
    {
        const query = `
    CREATE TABLE IF NOT EXISTS "actorCustomPage" (
      "id" serial,
      "content" TEXT,
      "type" varchar(255) NOT NULL,
      "actorId" integer NOT NULL REFERENCES "actor" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
      "createdAt" timestamp WITH time zone NOT NULL,
      "updatedAt" timestamp WITH time zone NOT NULL,
      PRIMARY KEY ("id")
    );
    `;
        await utils.sequelize.query(query);
    }
}
function down(options) {
    throw new Error('Not implemented.');
}
export { up, down };
//# sourceMappingURL=0650-actor-custom-pages.js.map