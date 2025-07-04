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
                    name: 'Trà sữa trân châu',
                    logo: 'https://res.cloudinary.com/dkmwrkngj/image/upload/v1751207446/337267182_1271630943434068_2574573437526612969_n_pbifhw.png',
                    description: null,
                    theme_config: JSON.stringify({
                        sender: {
                            light: {
                                text_color: '#fff',
                                background_color: '#C6A26E',
                            },
                            dark: {
                                text_color: '#fff',
                                background_color: '#CA9157',
                            },
                        },
                        receiver: {
                            light: {
                                text_color: '#000',
                                background_color: '#FFF3E2',
                            },
                            dark: {
                                text_color: '#fff',
                                background_color: '#4F2B01',
                            },
                        },
                        background_theme: {
                            light: {
                                background:
                                    'https://res.cloudinary.com/dkmwrkngj/image/upload/v1751208001/463393824_463493770035689_8178200017497447895_n_hemzbd.png',
                                header_color: '#ffddad',
                                footer_color: '#ffddad',
                            },
                            dark: {
                                background:
                                    'https://res.cloudinary.com/dkmwrkngj/image/upload/v1751207842/463072574_1274257017330202_3663174031765452520_n_z5er6v.png',
                                header_color: '#814e39',
                                footer_color: '#814e39',
                            },
                        },
                        reply_message: {
                            light: {
                                background_color: '#fEEACE',
                            },
                            dark: {
                                background_color: '#613818',
                            },
                        },
                    }),
                    emoji: '1f9cb',
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
        await queryInterface.bulkDelete('themes', {
            name: 'Trà sữa trân châu',
        })
    },
}
