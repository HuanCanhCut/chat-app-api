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
        await queryInterface.sequelize.transaction(async (t) => {
            try {
                await queryInterface.addColumn(
                    'stories',
                    'uuid',
                    {
                        type: Sequelize.UUID,
                        defaultValue: Sequelize.UUIDV4,
                        allowNull: false,
                    },
                    {
                        transaction: t,
                    },
                )

                const stories = await queryInterface.sequelize.query(`SELECT id FROM stories`, {
                    transaction: t,
                })

                const storyIds = stories[0].map((story) => story.id)

                if (storyIds.length) {
                    const uuid = crypto.randomUUID()

                    await queryInterface.sequelize.query(`UPDATE stories SET uuid = :uuid WHERE id IN (:storyIds)`, {
                        replacements: { uuid, storyIds },
                        transaction: t,
                    })
                }

                await queryInterface.addIndex('stories', ['uuid'], {
                    unique: true,
                    name: 'stories_uuid_idx',
                    transaction: t,
                })
            } catch (_) {
                //
            }
        })
    },

    async down(queryInterface, Sequelize) {
        /**
         * Add reverting commands here.
         *
         * Example:
         * await queryInterface.dropTable('users');
         */
        await queryInterface.removeColumn('stories', 'uuid')
    },
}
