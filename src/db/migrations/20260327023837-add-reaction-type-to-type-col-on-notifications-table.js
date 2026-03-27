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
        await queryInterface.changeColumn('notifications', 'type', {
            type: Sequelize.ENUM('friend_request', 'accept_friend_request', 'message', 'reaction'),
            allowNull: false,
        })
    },

    async down(queryInterface, Sequelize) {
        /**
         * Add reverting commands here.
         *
         * Example:
         * await queryInterface.dropTable('users');
         */
        await queryInterface.changeColumn('notifications', 'type', {
            type: Sequelize.ENUM('friend_request', 'accept_friend_request', 'message'),
            allowNull: false,
        })
    },
}
