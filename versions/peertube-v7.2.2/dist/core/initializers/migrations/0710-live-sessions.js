async function up(utils) {
    const { transaction } = utils;
    const query = `
  CREATE TABLE IF NOT EXISTS "videoLiveSession" (
    "id" serial,
    "startDate" timestamp with time zone NOT NULL,
    "endDate" timestamp with time zone,
    "error" integer,
    "replayVideoId" integer REFERENCES "video" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    "liveVideoId" integer REFERENCES "video" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    "createdAt" timestamp with time zone NOT NULL,
    "updatedAt" timestamp with time zone NOT NULL,
    PRIMARY KEY ("id")
  );
  `;
    await utils.sequelize.query(query, { transaction });
}
function down() {
    throw new Error('Not implemented.');
}
export { up, down };
//# sourceMappingURL=0710-live-sessions.js.map