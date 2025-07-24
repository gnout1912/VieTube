import * as Sequelize from 'sequelize';
async function up(utils) {
    const { transaction } = utils;
    {
        await utils.queryInterface.addColumn('videoSource', 'keptOriginalFilename', {
            type: Sequelize.STRING,
            allowNull: true
        }, { transaction });
    }
    {
        await utils.queryInterface.addColumn('videoSource', 'storage', {
            type: Sequelize.INTEGER,
            allowNull: true
        }, { transaction });
    }
    {
        await utils.queryInterface.addColumn('videoSource', 'resolution', {
            type: Sequelize.INTEGER,
            allowNull: true
        }, { transaction });
    }
    {
        await utils.queryInterface.addColumn('videoSource', 'width', {
            type: Sequelize.INTEGER,
            allowNull: true
        }, { transaction });
    }
    {
        await utils.queryInterface.addColumn('videoSource', 'height', {
            type: Sequelize.INTEGER,
            allowNull: true
        }, { transaction });
    }
    {
        await utils.queryInterface.addColumn('videoSource', 'fps', {
            type: Sequelize.INTEGER,
            allowNull: true
        }, { transaction });
    }
    {
        await utils.queryInterface.addColumn('videoSource', 'size', {
            type: Sequelize.INTEGER,
            allowNull: true
        }, { transaction });
    }
    {
        await utils.queryInterface.addColumn('videoSource', 'metadata', {
            type: Sequelize.JSONB,
            allowNull: true
        }, { transaction });
    }
    {
        await utils.queryInterface.addColumn('videoSource', 'fileUrl', {
            type: Sequelize.STRING,
            allowNull: true
        }, { transaction });
    }
    {
        await utils.queryInterface.renameColumn('videoSource', 'filename', 'inputFilename', { transaction });
    }
    {
        await utils.queryInterface.addColumn('userExport', 'fileUrl', {
            type: Sequelize.STRING,
            allowNull: true
        }, { transaction });
    }
}
function down(options) {
    throw new Error('Not implemented.');
}
export { down, up };
//# sourceMappingURL=0830-keep-original-file.js.map