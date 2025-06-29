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
        await queryInterface.addColumn('conversations', 'theme_id', {
            type: Sequelize.INTEGER,
            allowNull: false,
            defaultValue: 1,
            references: {
                model: 'conversation_themes',
                key: 'id',
            },
            onDelete: 'SET DEFAULT',
            onUpdate: 'CASCADE',
        })
    },

    async down(queryInterface, Sequelize) {
        /**
         * Add reverting commands here.
         *
         * Example:
         * await queryInterface.dropTable('users');
         */
        await queryInterface.removeColumn('conversations', 'theme_id')
    },
}
