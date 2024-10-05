import { QueryTypes } from 'sequelize'
import { sequelize } from '~/config/db'

interface friendCount {
    count: number
}

const getFriendsCount = async (id: number /* id của người dùng muốn lấy danh sách */): Promise<number> => {
    // Dùng raw query, không được dùng query builder vì sẽ gây ra đệ quy trong FriendShipModel
    const query = `
                    SELECT
                        COUNT(friendships.user_id) AS count
                    FROM
                        friendships
                    JOIN
                        users ON users.id = friendships.user_id OR
                        users.id = friendships.friend_id
                    WHERE
                        friendships.status = 'accepted'
                    AND
                        users.id = ?
                    GROUP BY
                        friendships.user_id
                `

    const resultQuery: friendCount[] = await sequelize.query(query, {
        replacements: [id],
        type: QueryTypes.SELECT,
    })

    let count: number = 0
    if (resultQuery.length) {
        count = resultQuery[0].count
    }

    return count
}

export default getFriendsCount
