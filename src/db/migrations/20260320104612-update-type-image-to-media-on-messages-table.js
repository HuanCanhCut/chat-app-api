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
        await queryInterface.sequelize.query(`
            UPDATE messages
            SET type = 'media'
            WHERE type = 'image';
        `)
    },

    async down(queryInterface, Sequelize) {
        /**
         * Add reverting commands here.
         *
         * Example:
         * await queryInterface.dropTable('users');
         */
        await queryInterface.sequelize.query(`
            UPDATE messages
            SET type = 'image'
            WHERE type = 'media';
        `)
    },
}
