import * as Sequelize from 'sequelize';
async function up(utils) {
    {
        const data = {
            type: Sequelize.DATE,
            defaultValue: null,
            allowNull: true
        };
        await utils.queryInterface.addColumn('userRegistration', 'processedAt', data);
    }
    {
        const data = {
            type: Sequelize.DATE,
            defaultValue: null,
            allowNull: true
        };
        await utils.queryInterface.addColumn('abuse', 'processedAt', data);
    }
}
function down(options) {
    throw new Error('Not implemented.');
}
export { up, down };
//# sourceMappingURL=0820-abuse-registration-stats.js.map