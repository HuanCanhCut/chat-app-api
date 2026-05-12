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
        await queryInterface.removeColumn('posts', 'reaction_count')
        await queryInterface.removeColumn('posts', 'comment_count')
    },

    async down(queryInterface, Sequelize) {
        /**
         * Add reverting commands here.
         *
         * Example:
         * await queryInterface.dropTable('users');
         */
        await queryInterface.addColumn('posts', 'reaction_count', {
            type: Sequelize.INTEGER,
            allowNull: false,
            defaultValue: 0,
        })

        await queryInterface.addColumn('posts', 'comment_count', {
            type: Sequelize.INTEGER,
            allowNull: false,
            defaultValue: 0,
        })
    },
}
