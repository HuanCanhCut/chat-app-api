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
        await queryInterface.createTable('conversation_themes', {
            id: {
                type: Sequelize.INTEGER,
                autoIncrement: true,
                primaryKey: true,
            },
            theme_config: {
                type: Sequelize.JSON,
                allowNull: false,
            },
            name: {
                type: Sequelize.STRING,
                allowNull: false,
                defaultValue: 'Cổ điển',
                unique: true,
            },
            logo: {
                type: Sequelize.STRING,
                allowNull: false,
                unique: true,
            },
            description: {
                type: Sequelize.STRING,
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

        await queryInterface.bulkInsert('conversation_themes', [
            {
                name: 'Cổ điển',
                logo: 'https://res.cloudinary.com/dkmwrkngj/image/upload/v1751185960/images-removebg-preview_t36s8e.png',
                description: null,
                theme_config: JSON.stringify({
                    sender: {
                        light: {
                            text_color: '#fff',
                            background_color: '#0099ff',
                        },
                        dark: {
                            text_color: '#fff',
                            background_color: '#0E92EB',
                        },
                    },
                    receiver: {
                        light: {
                            text_color: '#000',
                            background_color: '#F0F0F0',
                        },
                        dark: {
                            text_color: '#fff',
                            background_color: '#303030',
                        },
                    },
                    background_theme: {
                        light: {
                            background: null,
                        },
                        dark: {
                            background: null,
                        },
                    },
                }),
            },
        ])
    },

    async down(queryInterface, Sequelize) {
        /**
         * Add reverting commands here.
         *
         * Example:
         * await queryInterface.dropTable('users');
         */
        await queryInterface.dropTable('conversation_themes')
    },
}
