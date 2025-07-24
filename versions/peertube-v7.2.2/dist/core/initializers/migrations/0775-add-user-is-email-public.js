import * as Sequelize from 'sequelize';
async function up(utils) {
    const data = {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
    };
    await utils.queryInterface.addColumn('user', 'emailPublic', data);
}
function down(options) {
    throw new Error('Not implemented.');
}
export { up, down };
//# sourceMappingURL=0775-add-user-is-email-public.js.map