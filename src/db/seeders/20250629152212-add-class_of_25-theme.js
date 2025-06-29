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
                    name: 'Khóa 2025',
                    logo: 'https://res.cloudinary.com/dkmwrkngj/image/upload/v1751210370/494968377_2035701133622102_5454003839690686785_n_a9nmaq.jpg',
                    description: 'Tranh của Lim KangLi',
                    theme_config: JSON.stringify({
                        sender: {
                            light: {
                                text_color: '#fff',
                                background_color: '#2F1D71',
                            },
                            dark: {
                                text_color: '#fff',
                                background_color: '#FFCA60',
                            },
                        },
                        receiver: {
                            light: {
                                text_color: '#000',
                                background_color: '#ffffff',
                            },
                            dark: {
                                text_color: '#fff',
                                background_color: '#0F1640',
                            },
                        },
                        background_theme: {
                            light: {
                                background:
                                    'https://res.cloudinary.com/dkmwrkngj/image/upload/v1751210496/492824150_1677548329559910_8608362685492317298_n_m3ok2x.jpg',
                            },
                            dark: {
                                background:
                                    'https://res.cloudinary.com/dkmwrkngj/image/upload/v1751210497/493914117_1616437225725656_4750356188775802173_n_bnqqii.jpg',
                            },
                        },
                        emoji: '1f393',
                    }),
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
            name: 'Khóa 2025',
        })
    },
}
