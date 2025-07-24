async function up(utils) {
    await utils.sequelize.query('DROP INDEX IF EXISTS video_views;');
}
function down(options) {
    throw new Error('Not implemented.');
}
export { up, down };
//# sourceMappingURL=0610-views-index%20copy.js.map