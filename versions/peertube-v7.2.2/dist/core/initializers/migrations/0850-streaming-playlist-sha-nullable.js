import * as Sequelize from 'sequelize';
async function up(utils) {
    const { transaction } = utils;
    {
        await utils.queryInterface.changeColumn('videoStreamingPlaylist', 'segmentsSha256Filename', {
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
//# sourceMappingURL=0850-streaming-playlist-sha-nullable.js.map