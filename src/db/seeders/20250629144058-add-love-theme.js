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
                    logo: 'https://res.cloudinary.com/dkmwrkngj/image/upload/v1751208133/148082747_1138998106591214_5618240141689110769_n_jqn3le.jpg',
                    description: null,
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
                                background_image:
                                    'https://res.cloudinary.com/dkmwrkngj/image/upload/v1751208434/504158063_1874427243292182_4228321411406763260_n_freqpy.jpg',
                                background_color: '#ffecf7',
                            },
                            dark: {
                                background_image:
                                    'https://res.cloudinary.com/dkmwrkngj/image/upload/v1751208379/504390487_29888933354085736_7832433412329963773_n_d12wxb.jpg',
                                background_color: '#8c1a72',
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
