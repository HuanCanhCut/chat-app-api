'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        /**
         * Add altering commands here.
         *
         * Example:
         * await queryInterface.createTable('users', { id: Sequelize.INTEGER });
         */
        await queryInterface.createTable('conversations', {
            id: {
                type: Sequelize.INTEGER,
                primaryKey: true,
                autoIncrement: true,
            },
            is_group: {
                type: Sequelize.BOOLEAN,
                allowNull: false,
                defaultValue: false,
            },
            name: {
                type: Sequelize.STRING,
                allowNull: true,
            },
            avatar: {
                type: Sequelize.STRING,
                allowNull: true,
            },
            uuid: {
                type: Sequelize.STRING,
                allowNull: false,
            },
            emoji: {
                type: Sequelize.STRING,
                allowNull: false,
                defaultValue: '1f44d',
            },
            created_at: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
            },
            updated_at: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
            },
        })

        await queryInterface.addIndex('conversations', {
            unique: true,
            fields: ['uuid'],
        })

        await queryInterface.addIndex('conversations', {
            fields: ['name'],
            type: 'FULLTEXT',
        })
    },

    async down(queryInterface, Sequelize) {
        /**
         * Add reverting commands here.
         *
         * Example:
         * await queryInterface.dropTable('users');
         */
        await queryInterface.dropTable('conversations')
    },
}
