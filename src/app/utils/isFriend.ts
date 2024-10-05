import { literal, Op } from 'sequelize'
import { Friendships } from '../models'
import { User } from '../models'

export const friendShipJoinLiteral = (userId: number) => {
    return literal(`
            (user.id = Friendships.friend_id AND Friendships.user_id = ${userId})
        OR
            (user.id = Friendships.user_id AND Friendships.friend_id = ${userId})
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
        },
    })

    return isFriend ? true : false
}

export default checkIsFriend
