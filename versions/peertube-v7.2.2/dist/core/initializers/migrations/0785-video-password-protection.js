async function up(utils) {
    {
        const query = `
      CREATE TABLE IF NOT EXISTS "videoPassword" (
        "id"   SERIAL,
        "password" VARCHAR(255) NOT NULL,
        "videoId" INTEGER NOT NULL REFERENCES "video" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
        "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL,
        "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL,
        PRIMARY KEY ("id")
      );
    `;
        await utils.sequelize.query(query, { transaction: utils.transaction });
    }
}
function down(options) {
    throw new Error('Not implemented.');
}
export { up, down };
//# sourceMappingURL=0785-video-password-protection.js.map