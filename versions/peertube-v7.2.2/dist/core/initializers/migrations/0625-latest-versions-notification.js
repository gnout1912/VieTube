async function up(utils) {
    {
        await utils.sequelize.query(`
      ALTER TABLE "userNotification"
      ADD COLUMN "applicationId" INTEGER REFERENCES "application" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
      ADD COLUMN "pluginId" INTEGER REFERENCES "plugin" ("id") ON DELETE SET NULL ON UPDATE CASCADE
    `);
    }
}
function down(options) {
    throw new Error('Not implemented.');
}
export { up, down };
//# sourceMappingURL=0625-latest-versions-notification.js.map