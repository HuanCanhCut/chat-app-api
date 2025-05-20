import { literal, Op } from 'sequelize'
import { Friendships } from '../models'
import { User } from '../models'
import { sequelize } from '~/config/database'

interface SendMakeFriendRequestProps {
    userId: number
    friendId: number
    toWay?: boolean
}

class FriendService {
    friendShipJoinLiteral = (userId: number) => {
        return literal(`
                (user.id = Friendships.friend_id AND Friendships.user_id = ${sequelize.escape(userId)}) 
            OR
                (user.id = Friendships.user_id AND Friendships.friend_id = ${sequelize.escape(userId)})
            `)
    }

    checkIsFriend = async (userId: number, friendId: number): Promise<boolean> => {
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
                on: this.friendShipJoinLiteral(userId),
                attributes: {
                    exclude: ['password', 'email'],
                },
            },
        })

        return isFriend ? true : false
    }

    sendMakeFriendRequest = async ({ userId, friendId, toWay = false }: SendMakeFriendRequestProps) => {
        const WHERE_CONDITION = toWay
            ? { [Op.and]: [{ status: 'pending' }, { [Op.or]: [{ user_id: friendId }, { friend_id: friendId }] }] }
            : { [Op.and]: [{ status: 'pending' }, { friend_id: friendId }] }
        return await Friendships.findOne({
            where: WHERE_CONDITION,
            include: {
                model: User,
                as: 'user',
                required: true,
                on: this.friendShipJoinLiteral(userId),
                attributes: {
                    exclude: ['password', 'email'],
                },
            },
        })
    }
}

export default new FriendService()
