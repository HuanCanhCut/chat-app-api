'use strict'

module.exports = {
    async up(queryInterface, Sequelize) {
        return queryInterface.sequelize.transaction(async (t) => {
            const [messages] = await queryInterface.sequelize.query(
                "SELECT id, content, created_at, updated_at FROM messages WHERE type = 'image'",
                { transaction: t },
            )

            const batchSize = 500
            let bulk = []
            let messageIds = []

            for (const msg of messages) {
                let content = []

                try {
                    content = JSON.parse(msg.content || '[]')
                } catch {
                    content = []
                }

                if (!Array.isArray(content)) continue

                for (const url of content) {
                    bulk.push({
                        message_id: msg.id,
                        media_url: url,
                        media_type: 'image',
                        created_at: msg.created_at,
                        updated_at: msg.updated_at,
                    })
                }

                messageIds.push(msg.id)

                // batch insert để tránh RAM + timeout
                if (bulk.length >= batchSize) {
                    await queryInterface.bulkInsert('message_media', bulk, { transaction: t })
                    bulk = []
                }
            }

            // insert phần còn lại
            if (bulk.length > 0) {
                await queryInterface.bulkInsert('message_media', bulk, { transaction: t })
            }

            // update messages
            if (messageIds.length > 0) {
                await queryInterface.sequelize.query(`UPDATE messages SET content = '' WHERE id IN (:ids)`, {
                    replacements: { ids: messageIds },
                    transaction: t,
                })
            }
        })
    },

    async down(queryInterface, Sequelize) {
        return queryInterface.sequelize.transaction(async (t) => {
            // chỉ xoá những record có media_type = image (an toàn hơn)
            await queryInterface.bulkDelete('message_media', { media_type: 'image' }, { transaction: t })
        })
    },
}
