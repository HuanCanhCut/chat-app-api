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

        await queryInterface.addIndex('friendships', ['user_id', 'friend_id'], {
            name: 'friendships_user_friend_idx',
            unique: true,
        })

        await queryInterface.addIndex('friendships', ['friend_id', 'user_id'], {
            name: 'friendships_friend_user_idx',
            unique: true,
        })

        await queryInterface.addIndex('friendships', ['user_id'], {
            name: 'friendships_user_idx',
        })

        await queryInterface.addIndex('friendships', ['friend_id'], {
            name: 'friendships_friend_idx',
        })

        await queryInterface.addIndex('friendships', ['status'], {
            name: 'friendships_status_idx',
        })
    },

    async down(queryInterface, Sequelize) {
        /**
         * Add reverting commands here.
         *
         * Example:
         * await queryInterface.dropTable('users');
         */

        await queryInterface.removeIndex('friendships', 'friendships_user_friend_idx')
        await queryInterface.removeIndex('friendships', 'friendships_friend_user_idx')
        await queryInterface.removeIndex('friendships', 'friendships_user_idx')
        await queryInterface.removeIndex('friendships', 'friendships_friend_idx')
        await queryInterface.removeIndex('friendships', 'friendships_status_idx')
    },
}
