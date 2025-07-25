import { FileStorage } from '@peertube/peertube-models';
import * as Sequelize from 'sequelize';
async function up(utils) {
    const { transaction } = utils;
    {
        await utils.queryInterface.addColumn('videoCaption', 'storage', {
            type: Sequelize.INTEGER,
            allowNull: true,
            defaultValue: FileStorage.FILE_SYSTEM
        }, { transaction });
        await utils.queryInterface.changeColumn('videoCaption', 'storage', {
            type: Sequelize.INTEGER,
            allowNull: false,
            defaultValue: null
        }, { transaction });
    }
}
function down(options) {
    throw new Error('Not implemented.');
}
export { down, up };
//# sourceMappingURL=0875-caption-object-storage.js.map