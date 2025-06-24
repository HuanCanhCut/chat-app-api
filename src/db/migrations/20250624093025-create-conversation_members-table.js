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
        await queryInterface.createTable('conversation_members', {
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
            nickname: {
                type: Sequelize.STRING,
                allowNull: true,
            },
            role: {
                type: Sequelize.ENUM('admin', 'leader', 'member'),
                allowNull: false,
                defaultValue: 'member',
            },
            user_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: {
                    model: 'users',
                    key: 'id',
                },
            },
            joined_at: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.NOW,
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

        await queryInterface.addIndex('conversation_members', {
            unique: true,
            fields: ['conversation_id', 'user_id'],
            name: 'idx_user_conversation',
        })

        await queryInterface.addIndex('conversation_members', {
            fields: ['user_id'],
            name: 'idx_user_id',
        })

        await queryInterface.addIndex('conversation_members', {
            fields: ['conversation_id'],
            name: 'idx_conversation_id',
        })
    },

    async down(queryInterface, Sequelize) {
        /**
         * Add reverting commands here.
         *
         * Example:
         * await queryInterface.dropTable('users');
         */
        await queryInterface.dropTable('conversation_members')
    },
}
