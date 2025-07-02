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
        await queryInterface.changeColumn('messages', 'type', {
            type: Sequelize.ENUM(
                'text',
                'image',
                'icon',
                'system_change_group_name',
                'system_set_nickname',
                'system_change_theme',
                'system_add_user',
                'system_remove_user',
                'system_change_group_avatar',
                'system_change_emoji',
                'system_block_user',
                'system_appoint_leader',
                'system_remove_leader',
            ),
            allowNull: false,
            defaultValue: 'text',
        })
    },

    async down(queryInterface, Sequelize) {
        /**
         * Add reverting commands here.
         *
         * Example:
         * await queryInterface.dropTable('users');
         */
        await queryInterface.changeColumn('messages', 'type', {
            type: Sequelize.ENUM(
                'text',
                'image',
                'icon',
                'system_change_group_name',
                'system_set_nickname',
                'system_change_theme',
                'system_add_user',
                'system_remove_user',
                'system_change_group_avatar',
                'system_change_emoji',
                'system_block_user',
            ),
            allowNull: false,
            defaultValue: 'text',
        })
    },
}
