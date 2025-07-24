async function up(utils) {
    await utils.queryInterface.renameColumn('user', 'webTorrentEnabled', 'p2pEnabled');
    await utils.sequelize.query('ALTER TABLE "user" ALTER COLUMN "p2pEnabled" DROP DEFAULT');
}
function down(options) {
    throw new Error('Not implemented.');
}
export { up, down };
//# sourceMappingURL=0675-p2p-enabled.js.map