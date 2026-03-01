'use strict'

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        const transaction = await queryInterface.sequelize.transaction()

        try {
            await queryInterface.renameTable('message_reactions', 'reactions', { transaction })

            await queryInterface.addColumn(
                'reactions',
                'reactionable_type',
                {
                    type: Sequelize.ENUM('Message', 'Post', 'Comment'),
                    allowNull: true,
                },
                { transaction },
            )

            await queryInterface.renameColumn('reactions', 'message_id', 'reactionable_id', { transaction })

            await queryInterface.bulkUpdate(
                'reactions',
                { reactionable_type: 'Message' },
                { reactionable_type: null },
                { transaction },
            )

            await queryInterface.changeColumn(
                'reactions',
                'reactionable_type',
                {
                    type: Sequelize.ENUM('Message', 'Post', 'Comment'),
                    allowNull: false,
                },
                { transaction },
            )

            await transaction.commit()
        } catch (error) {
            await transaction.rollback()
            throw error
        }
    },

    async down(queryInterface, Sequelize) {
        const transaction = await queryInterface.sequelize.transaction()

        try {
            await queryInterface.renameColumn('reactions', 'reactionable_id', 'message_id', { transaction })

            await queryInterface.removeColumn('reactions', 'reactionable_type', { transaction })

            await queryInterface.renameTable('reactions', 'message_reactions', { transaction })

            await transaction.commit()
        } catch (error) {
            await transaction.rollback()
            throw error
        }
    },
}
