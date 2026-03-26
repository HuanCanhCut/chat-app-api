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
        await queryInterface.changeColumn('stories', 'type', {
            allowNull: false,
            type: Sequelize.ENUM('image', 'video', 'text'),
        })

        await queryInterface.addColumn('stories', 'background_url', {
            type: Sequelize.STRING,
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
        await queryInterface.changeColumn('stories', 'type', {
            allowNull: false,
            type: Sequelize.ENUM('image', 'video'),
        })
        await queryInterface.removeColumn('stories', 'background_url')
    },
}
