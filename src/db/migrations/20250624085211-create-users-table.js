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

        await queryInterface.createTable('users', {
            id: {
                type: Sequelize.INTEGER,
                primaryKey: true,
                autoIncrement: true,
                allowNull: false,
            },
            first_name: {
                type: Sequelize.STRING,
                allowNull: false,
                defaultValue: '',
            },
            last_name: {
                type: Sequelize.STRING,
                allowNull: false,
                defaultValue: '',
            },
            full_name: {
                type: Sequelize.STRING,
                allowNull: false,
                defaultValue: '',
            },
            nickname: {
                type: Sequelize.STRING,
                allowNull: false,
            },
            uuid: {
                type: Sequelize.STRING,
                allowNull: false,
            },
            email: {
                type: Sequelize.STRING,
                allowNull: false,
                validate: {
                    isEmail: true,
                },
            },
            avatar: {
                type: Sequelize.STRING,
                allowNull: false,
                defaultValue: '',
            },
            cover_photo: {
                type: Sequelize.STRING,
                allowNull: false,
                defaultValue: '',
            },
            password: {
                type: Sequelize.TEXT,
                allowNull: false,
                defaultValue: '',
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

        queryInterface.addIndex('users', ['full_name', 'nickname'], {
            type: 'FULLTEXT',
            name: 'user_search_idx',
        })

        queryInterface.addIndex('users', ['email'], {
            unique: true,
        })

        queryInterface.addIndex('users', ['email', 'nickname'], {
            unique: true,
        })
    },

    async down(queryInterface, Sequelize) {
        /**
         * Add reverting commands here.
         *
         * Example:
         * await queryInterface.dropTable('users');
         */
        await queryInterface.dropTable('users')
    },
}
