'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        /**
         * Add seed commands here.
         *
         * Example:
         * await queryInterface.bulkInsert('People', [{
         *   name: 'John Doe',
         *   isBetaMember: false
         * }], {});
         */
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
                            background: '#fff',
                            header_color: '#ffffff',
                            footer_color: '#ffffff',
                        },
                        dark: {
                            background: '#212223',
                            header_color: '#212223',
                            footer_color: '#212223',
                        },
                    },
                    reply_message: {
                        light: {
                            background_color: '#F6F6F6',
                        },
                        dark: {
                            background_color: '#8383838d',
                        },
                    },
                }),
                emoji: '1f44d',
            },
        ])
    },

    async down(queryInterface, Sequelize) {
        /**
         * Add commands to revert seed here.
         *
         * Example:
         * await queryInterface.bulkDelete('People', null, {});
         */
        await queryInterface.bulkDelete('conversation_themes', {
            name: 'Cổ điển',
        })
    },
}
