import * as Sequelize from 'sequelize';
async function up(utils) {
    const { transaction } = utils;
    {
        await utils.queryInterface.changeColumn('videoSource', 'size', {
            type: Sequelize.BIGINT,
            allowNull: true
        }, { transaction });
    }
}
function down(options) {
    throw new Error('Not implemented.');
}
export { down, up };
//# sourceMappingURL=0835-video-source-size.js.map