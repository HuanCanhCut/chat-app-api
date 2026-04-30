'use strict'

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { randomUUID } = require('crypto')
/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        /**
         * Add altering commands here.
         *
         * Example:
         * await queryInterface.createTable('users', { id: Sequelize.INTEGER });
         */
        try {
            await queryInterface.sequelize.transaction(async (t) => {
                const [users] = await queryInterface.sequelize.query(
                    `
                    SELECT id 
                    FROM users
                    WHERE id != ${process.env.BOT_ID}
                `,
                    {
                        transaction: t,
                    },
                )

                for (const user of users) {
                    await queryInterface.sequelize.query(
                        `
                        INSERT INTO conversations(is_group, name, uuid, emoji, theme_id)
                        VALUES (${false}, 'Penguin AI', '${randomUUID()}', '1f44d', 1)
                    `,
                        {
                            transaction: t,
                        },
                    )

                    const [[result]] = await queryInterface.sequelize.query(
                        `
                        SELECT LAST_INSERT_ID() as id
                    `,
                        {
                            transaction: t,
                        },
                    )

                    if (result.id) {
                        await Promise.all([
                            await queryInterface.sequelize.query(
                                `
                                INSERT INTO conversation_members (conversation_id, user_id, joined_at)
                                VALUES (${result.id}, ${user.id}, NOW())
                            `,
                                {
                                    transaction: t,
                                },
                            ),

                            await queryInterface.sequelize.query(
                                `
                                INSERT INTO conversation_members (conversation_id, user_id, nickname, joined_at)
                                VALUES (${result.id}, ${Number(process.env.BOT_ID)}, 'Penguin AI', NOW())
                            `,
                                {
                                    transaction: t,
                                },
                            ),
                        ])
                    }
                }
            })
        } catch (error) {
            console.log(error)
            // If the execution reaches this line, an error occurred.
            // The transaction has already been rolled back automatically by Sequelize!
        }
    },

    async down(queryInterface, Sequelize) {
        /**
         * Add reverting commands here.
         *
         * Example:
         * await queryInterface.dropTable('users');
         */
        await queryInterface.sequelize.query(`
            DELETE FROM conversations WHERE name = 'Penguin AI'
        `)
    },
}
