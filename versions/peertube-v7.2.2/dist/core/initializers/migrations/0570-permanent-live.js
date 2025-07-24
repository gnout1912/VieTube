import * as Sequelize from 'sequelize';
async function up(utils) {
    {
        const data = {
            type: Sequelize.BOOLEAN,
            defaultValue: false,
            allowNull: false
        };
        await utils.queryInterface.addColumn('videoLive', 'permanentLive', data);
    }
}
function down(options) {
    throw new Error('Not implemented.');
}
export { up, down };
//# sourceMappingURL=0570-permanent-live.js.map