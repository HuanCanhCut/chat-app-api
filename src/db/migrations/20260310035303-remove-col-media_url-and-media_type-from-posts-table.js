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
        await queryInterface.removeColumn('posts', 'media_url')
        await queryInterface.removeColumn('posts', 'media_type')
    },

    async down(queryInterface, Sequelize) {
        /**
         * Add reverting commands here.
         *
         * Example:
         * await queryInterface.dropTable('users');
         */
        await queryInterface.addColumn('posts', 'media_url', {
            type: Sequelize.STRING,
            allowNull: true,
        })
        await queryInterface.addColumn('posts', 'media_type', {
            type: Sequelize.ENUM('image', 'video'),
            allowNull: true,
        })
    },
}
