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
        await queryInterface.addColumn('notifications', 'target_type', {
            type: Sequelize.STRING,
            allowNull: true,
        })
        await queryInterface.addColumn('notifications', 'target_id', {
            type: Sequelize.INTEGER,
            allowNull: true,
        })

        const notifications = await queryInterface.sequelize.query('SELECT id, type, actor_id FROM notifications', {
            type: queryInterface.sequelize.QueryTypes.SELECT,
        })

        for (const notification of notifications) {
            switch (notification.type) {
                case 'friend_request':
                case 'accept_friend_request':
                    {
                        const actor_id = notification.actor_id

                        await queryInterface.bulkUpdate(
                            'notifications',
                            {
                                target_type: 'user',
                                target_id: actor_id,
                            },
                            {
                                id: notification.id,
                            },
                        )
                    }

                    break
            }
        }
    },

    async down(queryInterface, Sequelize) {
        /**
         * Add reverting commands here.
         *
         * Example:
         * await queryInterface.dropTable('users');
         */
        await queryInterface.removeColumn('notifications', 'target_type')
        await queryInterface.removeColumn('notifications', 'target_id')
    },
}
