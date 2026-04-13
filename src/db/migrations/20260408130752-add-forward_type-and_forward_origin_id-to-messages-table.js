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
        await queryInterface.addColumn('messages', 'forward_type', {
            type: Sequelize.ENUM('Message', 'Story', 'Post'),
            allowNull: true,
        })

        await queryInterface.addColumn('messages', 'forward_origin_id', {
            type: Sequelize.INTEGER,
            allowNull: true,
        })
    },

    async down(queryInterface, Sequelize) {
        /**
         * Add reverting commands here.
         *
         * Example:
         * await queryInterface.dropTable('users');
         */
        await queryInterface.removeColumn('messages', 'forward_type')
        await queryInterface.removeColumn('messages', 'forward_origin_id')
    },
}
