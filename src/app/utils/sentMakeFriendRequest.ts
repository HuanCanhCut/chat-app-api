import { Op } from 'sequelize'
import { Friendships, User } from '../models'
import { friendShipJoinLiteral } from './isFriend'

interface SendMakeFriendRequestProps {
    userId: number
    friendId: number
    toWay?: boolean
}

const sendMakeFriendRequest = async ({ userId, friendId, toWay = false }: SendMakeFriendRequestProps) => {
    const WHERE_CONDITION = toWay
        ? { [Op.and]: [{ status: 'pending' }, { [Op.or]: [{ user_id: friendId }, { friend_id: friendId }] }] }
        : { [Op.and]: [{ status: 'pending' }, { friend_id: friendId }] }
    return await Friendships.findOne({
        where: WHERE_CONDITION,
        include: {
            model: User,
            as: 'user',
            required: true,
            on: friendShipJoinLiteral(userId),
        },
    })
}

export default sendMakeFriendRequest
