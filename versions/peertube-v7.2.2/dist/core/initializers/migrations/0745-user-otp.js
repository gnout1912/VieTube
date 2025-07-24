import * as Sequelize from 'sequelize';
async function up(utils) {
    const { transaction } = utils;
    const data = {
        type: Sequelize.STRING,
        defaultValue: null,
        allowNull: true
    };
    await utils.queryInterface.addColumn('user', 'otpSecret', data, { transaction });
}
async function down(utils) {
}
export { up, down };
//# sourceMappingURL=0745-user-otp.js.map