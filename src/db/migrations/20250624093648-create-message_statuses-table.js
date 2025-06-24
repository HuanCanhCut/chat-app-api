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
        await queryInterface.createTable('message_statuses', {
            id: {
                type: Sequelize.INTEGER,
                primaryKey: true,
                autoIncrement: true,
            },
            message_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: {
                    model: 'messages',
                    key: 'id',
                },
            },
            receiver_id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: {
                    model: 'users',
                    key: 'id',
                },
            },
            status: {
                type: Sequelize.ENUM('read', 'delivered', 'sent'),
                allowNull: false,
                defaultValue: 'sent',
            },
            is_revoked: {
                type: Sequelize.BOOLEAN,
                allowNull: false,
                defaultValue: false,
            },
            revoke_type: {
                type: Sequelize.ENUM('for-me', 'for-other'),
                allowNull: true,
            },
            read_at: {
                type: Sequelize.DATE,
                allowNull: true,
                defaultValue: null,
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

        await queryInterface.addIndex('message_statuses', {
            name: 'message_status_message_id_receiver_id_index',
            fields: ['is_revoked', 'revoke_type'],
        })
    },

    async down(queryInterface, Sequelize) {
        /**
         * Add reverting commands here.
         *
         * Example:
         * await queryInterface.dropTable('users');
         */
        await queryInterface.dropTable('message_statuses')
    },
}
