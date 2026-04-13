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
        return queryInterface.sequelize.transaction(async (t) => {
            await queryInterface.sequelize.query(
                `
                    DELETE FROM message_media
                    WHERE media_url IS NULL OR media_url = ''
            `,
                { transaction: t },
            )

            await queryInterface.changeColumn(
                'message_media',
                'media_url',
                {
                    type: Sequelize.STRING,
                    allowNull: false,
                },
                { transaction: t },
            )
        })
    },

    async down(queryInterface, Sequelize) {
        /**
         * Add reverting commands here.
         *
         * Example:
         * await queryInterface.dropTable('users');
         */
        await queryInterface.changeColumn('message_media', 'media_url', {
            type: Sequelize.STRING,
            allowNull: true,
        })
    },
}
