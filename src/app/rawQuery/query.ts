import { sequelize } from '~/config/db'

export const getFriendsCount = (userId: number) => {
    return `
        SELECT
            COUNT(friendships.id) AS count
        FROM
            friendships
        JOIN
            users ON users.id = friendships.user_id OR
            users.id = friendships.friend_id
        WHERE
            friendships.status = 'accepted'
        AND
            users.id = ${sequelize.escape(userId)}
    `
}
