import * as Sequelize from 'sequelize';
async function up(utils) {
    await utils.queryInterface.addColumn('videoAbuse', 'predefinedReasons', {
        type: Sequelize.ARRAY(Sequelize.INTEGER),
        allowNull: true
    });
    await utils.queryInterface.addColumn('videoAbuse', 'startAt', {
        type: Sequelize.INTEGER,
        allowNull: true
    });
    await utils.queryInterface.addColumn('videoAbuse', 'endAt', {
        type: Sequelize.INTEGER,
        allowNull: true
    });
}
function down(options) {
    throw new Error('Not implemented.');
}
export { up, down };
//# sourceMappingURL=0515-video-abuse-reason-timestamps.js.map