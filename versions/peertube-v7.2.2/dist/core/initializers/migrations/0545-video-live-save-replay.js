import * as Sequelize from 'sequelize';
async function up(utils) {
    {
        const data = {
            type: Sequelize.BOOLEAN,
            defaultValue: false,
            allowNull: false
        };
        await utils.queryInterface.addColumn('videoLive', 'saveReplay', data);
    }
}
function down(options) {
    throw new Error('Not implemented.');
}
export { up, down };
//# sourceMappingURL=0545-video-live-save-replay.js.map