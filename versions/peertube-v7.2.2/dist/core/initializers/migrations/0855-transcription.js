import * as Sequelize from 'sequelize';
async function up(utils) {
    const { transaction } = utils;
    {
        await utils.queryInterface.addColumn('userNotification', 'videoCaptionId', {
            type: Sequelize.INTEGER,
            defaultValue: null,
            allowNull: true,
            references: {
                model: 'videoCaption',
                key: 'id'
            },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE'
        }, { transaction });
    }
    {
        {
            const data = {
                type: Sequelize.INTEGER,
                defaultValue: null,
                allowNull: true
            };
            await utils.queryInterface.addColumn('userNotificationSetting', 'myVideoTranscriptionGenerated', data, { transaction });
        }
        {
            const query = 'UPDATE "userNotificationSetting" SET "myVideoTranscriptionGenerated" = 1';
            await utils.sequelize.query(query, { transaction });
        }
        {
            const data = {
                type: Sequelize.INTEGER,
                defaultValue: null,
                allowNull: false
            };
            await utils.queryInterface.changeColumn('userNotificationSetting', 'myVideoTranscriptionGenerated', data, { transaction });
        }
    }
    {
        await utils.queryInterface.addColumn('videoJobInfo', 'pendingTranscription', {
            type: Sequelize.INTEGER,
            allowNull: false,
            defaultValue: 0
        }, { transaction });
    }
}
function down(options) {
    throw new Error('Not implemented.');
}
export { down, up };
//# sourceMappingURL=0855-transcription.js.map