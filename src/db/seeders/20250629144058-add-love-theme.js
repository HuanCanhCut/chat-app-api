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
                    name: 'Tình yêu',
                    logo: 'https://res.cloudinary.com/dkmwrkngj/image/upload/v1752209804/148082747_1138998106591214_5618240141689110769_n_vfruwi.jpg',
                    description: '',
                    theme_config: JSON.stringify({
                        sender: {
                            light: {
                                text_color: '#fff',
                                background_color: '#F9005A',
                            },
                            dark: {
                                text_color: '#fff',
                                background_color: '#FF1E6F',
                            },
                        },
                        receiver: {
                            light: {
                                text_color: '#000',
                                background_color: '#FFF5F5',
                            },
                            dark: {
                                text_color: '#fff',
                                background_color: '#642765',
                            },
                        },
                        background_theme: {
                            light: {
                                background:
                                    'https://res.cloudinary.com/dkmwrkngj/image/upload/v1752209953/504158063_1874427243292182_4228321411406763260_n_unpris.jpg',
                                header_color: '#ffecf7',
                                footer_color: '#FDD6E8',
                            },
                            dark: {
                                background:
                                    'https://res.cloudinary.com/dkmwrkngj/image/upload/v1752209952/504390487_29888933354085736_7832433412329963773_n_mkobni.jpg',
                                header_color: '#8c1a72',
                                footer_color: '#2B0037',
                            },
                        },
                        reply_message: {
                            light: {
                                background_color: '#FFE8F1',
                            },
                            dark: {
                                background_color: '#4f1952',
                            },
                        },
                    }),
                    emoji: '1f495',
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
            name: 'Tình yêu',
        })
    },
}
