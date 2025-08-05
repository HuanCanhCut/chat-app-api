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
        await queryInterface.bulkInsert(
            'conversation_themes',
            [
                {
                    name: 'Mắt trố',
                    logo: 'https://res.cloudinary.com/dkmwrkngj/image/upload/v1754408152/434651421_947904423390417_6372388309508820053_n_ellsyi.png',
                    description: '',
                    theme_config: JSON.stringify({
                        sender: {
                            light: {
                                text_color: '#fff',
                                background_color: '#0546EE',
                            },
                            dark: {
                                text_color: '#fff',
                                background_color: '#118839',
                            },
                        },
                        receiver: {
                            light: {
                                text_color: '#000',
                                background_color: '#DCF1FF',
                            },
                            dark: {
                                text_color: '#fff',
                                background_color: '#152021',
                            },
                        },
                        background_theme: {
                            light: {
                                background:
                                    'https://res.cloudinary.com/dkmwrkngj/image/upload/v1754408382/490323001_1411267726900937_8484871647020861051_n_i3nkdb.png',
                                header_color: '#43b6ff',
                                footer_color: '#43b6ff',
                            },
                            dark: {
                                background:
                                    'https://res.cloudinary.com/dkmwrkngj/image/upload/v1754408414/490524929_1355451482162560_3694025733256756243_n_eel8tc.png',
                                header_color: '#263b3e',
                                footer_color: '#263b3e',
                            },
                        },
                        reply_message: {
                            light: {
                                background_color: '#9FD9FF',
                            },
                            dark: {
                                background_color: '#1B2A2C',
                            },
                        },
                    }),
                    emoji: '1f92a',
                },
            ],
            {
                ignoreDuplicates: true,
            },
        )
    },

    async down(queryInterface, Sequelize) {
        /**
         * Add commands to revert seed here.
         *
         * Example:
         * await queryInterface.bulkDelete('People', null, {});
         */
        await queryInterface.bulkDelete('conversation_themes', {
            name: 'Mắt trố',
        })
    },
}
