import Notification from '~/app/models/NotificationModel'
import { User } from '../models'
import { NotFoundError } from '../errors/errors'

type NotificationMessage = 'vừa gửi cho bạn một lời mời kết bạn' | 'đã chấp nhận lời mời kết bạn'

interface ICreateNotification {
    recipientId: number
    type: 'friend_request' | 'accept_friend_request' | 'message'
    currentUserId: number
    message: NotificationMessage
}

const createNotification = async ({ recipientId, type, currentUserId, message }: ICreateNotification) => {
    const currentUser = await User.findOne({
        where: {
            id: currentUserId,
        },
    })

    if (!currentUser) {
        throw new NotFoundError({ message: 'User not found' })
    }

    const notification = await Notification.create({
        recipient_id: Number(recipientId),
        type,
        sender_id: currentUserId,
        message: `${currentUser.full_name} ${message}`,
    })

    const notificationData = {
        notification: {
            ...notification?.dataValues,
            sender_id: currentUserId,
            sender_user: currentUser,
        },
    }

    return notificationData
}

export default createNotification
