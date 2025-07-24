import * as Sequelize from 'sequelize';
async function up(utils) {
    {
        const field = {
            type: Sequelize.DATE,
            allowNull: true
        };
        await utils.queryInterface.addColumn('user', 'lastLoginDate', field);
    }
}
function down(options) {
    throw new Error('Not implemented.');
}
export { up, down };
//# sourceMappingURL=0505-user-last-login-date.js.map