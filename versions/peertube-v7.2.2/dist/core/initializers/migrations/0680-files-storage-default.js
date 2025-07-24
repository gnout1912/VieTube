async function up(utils) {
    await utils.sequelize.query('ALTER TABLE "videoFile" ALTER COLUMN "storage" SET DEFAULT 0');
    await utils.sequelize.query('ALTER TABLE "videoStreamingPlaylist" ALTER COLUMN "storage" SET DEFAULT 0');
}
function down(options) {
    throw new Error('Not implemented.');
}
export { up, down };
//# sourceMappingURL=0680-files-storage-default.js.map