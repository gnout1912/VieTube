async function up(utils) {
    const { transaction } = utils;
    {
        await utils.sequelize.query('DELETE FROM "userNotification" WHERE type = 20 AND "userRegistrationId" IS NULL', { transaction });
    }
    {
        await utils.sequelize.query('ALTER TABLE "userNotification" DROP CONSTRAINT "userNotification_userRegistrationId_fkey", ' +
            'ADD CONSTRAINT "userNotification_userRegistrationId_fkey" ' +
            'FOREIGN KEY ("userRegistrationId") REFERENCES "userRegistration" ("id") ON DELETE CASCADE ON UPDATE CASCADE', { transaction });
    }
}
function down(options) {
    throw new Error('Not implemented.');
}
export { up, down };
//# sourceMappingURL=0780-notification-registration.js.map