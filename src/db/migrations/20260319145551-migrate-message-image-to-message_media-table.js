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
            const [messageContent] = await queryInterface.sequelize.query(
                "SELECT id, content FROM messages WHERE type = 'image'",
                {
                    transaction: t,
                },
            )

            const messageBulkInsert = []

            for (let i = 0; i < messageContent.length; i++) {
                const content = JSON.parse(messageContent[i].content)

                for (let j = 0; j < content.length; j++) {
                    messageBulkInsert.push({
                        message_id: messageContent[i].id,
                        media_url: content[j],
                        media_type: 'image',
                    })
                }
            }

            await queryInterface.bulkInsert('message_media', messageBulkInsert, { transaction: t })

            const messageIds = messageContent.map((m) => m.id)

            await queryInterface.sequelize.query(
                `UPDATE messages SET content = '' WHERE id IN (${messageIds.join(',')})`,
                {
                    transaction: t,
                },
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
        return queryInterface.sequelize.transaction(async (t) => {
            await queryInterface.bulkDelete('message_media', {}, { transaction: t })
        })
    },
}
