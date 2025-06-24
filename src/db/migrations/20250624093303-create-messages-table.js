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
        await queryInterface.createTable('messages', {
            id: {
                type: Sequelize.INTEGER,
                primaryKey: true,
                autoIncrement: true,
            },
            conversation_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: {
                    model: 'conversations',
                    key: 'id',
                },
            },
            sender_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: {
                    model: 'users',
                    key: 'id',
                },
            },
            content: {
                type: Sequelize.TEXT,
                allowNull: false,
            },
            type: {
                type: Sequelize.ENUM(
                    'text',
                    'image',
                    'icon',
                    'system_change_group_name',
                    'system_set_nickname',
                    'system_change_theme',
                    'system_add_user',
                    'system_remove_user',
                ),
                allowNull: false,
                defaultValue: 'text',
            },
            parent_id: {
                type: Sequelize.INTEGER,
                allowNull: true,
                defaultValue: null,
                references: {
                    model: 'messages',
                    key: 'id',
                },
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

        await queryInterface.addIndex('messages', {
            fields: ['content'],
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
        await queryInterface.dropTable('messages')
    },
}
