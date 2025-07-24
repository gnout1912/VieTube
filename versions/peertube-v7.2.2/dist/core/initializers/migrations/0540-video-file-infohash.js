import * as Sequelize from 'sequelize';
async function up(utils) {
    {
        const data = {
            type: Sequelize.STRING,
            defaultValue: null,
            allowNull: true
        };
        await utils.queryInterface.changeColumn('videoFile', 'infoHash', data);
    }
}
function down(options) {
    throw new Error('Not implemented.');
}
export { up, down };
//# sourceMappingURL=0540-video-file-infohash.js.map