import { literal, Op } from 'sequelize'
import { Friendships } from '../models'
import { User } from '../models'
import { sequelize } from '~/config/database'

// escape userId để tránh SQL injection
export const friendShipJoinLiteral = (userId: number) => {
    return literal(`
            (user.id = Friendships.friend_id AND Friendships.user_id = ${sequelize.escape(userId)}) 
        OR
            (user.id = Friendships.user_id AND Friendships.friend_id = ${sequelize.escape(userId)})
        `)
}

const checkIsFriend = async (userId: number, friendId: number): Promise<boolean> => {
    const isFriend = await Friendships.findOne({
        attributes: ['user_id'],
        where: {
            status: 'accepted',
            [Op.or]: [{ friend_id: friendId }, { user_id: friendId }],
        },
        include: {
            model: User,
            as: 'user',
            required: true,
            on: friendShipJoinLiteral(userId),
            attributes: {
                exclude: ['password', 'email'],
            },
        },
    })

    return isFriend ? true : false
}

export default checkIsFriend
