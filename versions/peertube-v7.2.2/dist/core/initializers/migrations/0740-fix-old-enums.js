async function up(utils) {
    try {
        await utils.sequelize.query('drop type "enum_actorFollow_state"');
        await utils.sequelize.query('alter type "enum_AccountFollows_state" rename to "enum_actorFollow_state";');
    }
    catch (_a) {
    }
    try {
        await utils.sequelize.query('drop type "enum_accountVideoRate_type"');
        await utils.sequelize.query('alter type "enum_AccountVideoRates_type" rename to "enum_accountVideoRate_type";');
    }
    catch (_b) {
    }
}
async function down(utils) {
}
export { up, down };
//# sourceMappingURL=0740-fix-old-enums.js.map