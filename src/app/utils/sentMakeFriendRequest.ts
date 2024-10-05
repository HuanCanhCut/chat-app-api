import { Op } from 'sequelize'
import { Friendships, User } from '../models'
import { friendShipJoinLiteral } from './isFriend'

const sendMakeFriendRequest = async (userId: number, friendId: number) => {
    return await Friendships.findOne({
        where: {
            [Op.and]: [{ status: 'pending' }, { [Op.or]: [{ user_id: friendId }, { friend_id: friendId }] }],
        },
        include: {
            model: User,
            as: 'user',
            required: true,
            on: friendShipJoinLiteral(userId),
        },
    })
}

export default sendMakeFriendRequest
