import * as Sequelize from 'sequelize';
async function up(utils) {
    const { transaction } = utils;
    {
        await utils.queryInterface.addColumn('videoCaption', 'm3u8Filename', {
            type: Sequelize.STRING,
            defaultValue: null,
            allowNull: true
        }, { transaction });
    }
    {
        await utils.queryInterface.addColumn('videoCaption', 'm3u8Url', {
            type: Sequelize.STRING,
            defaultValue: null,
            allowNull: true
        }, { transaction });
    }
}
function down(options) {
    throw new Error('Not implemented.');
}
export { down, up };
//# sourceMappingURL=0890-hls-caption.js.map