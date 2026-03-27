import { NotFoundError } from '../errors/errors'
import { Notification, User } from '../models'
import { handleServiceError } from '../utils/handleServiceError'
import { NotificationType } from '~/types/notificationTypes'

interface ICreateNotification {
    recipientId: number
    type: NotificationType
    currentUserId: number
    message: string
    target_type: string
    target_id: number
}

class NotificationService {
    async create({ recipientId, type, currentUserId, message, target_type, target_id }: ICreateNotification) {
        try {
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
                actor_id: currentUserId,
                message: `${message}`,
                target_type,
                target_id,
            })

            return await Notification.findByPk(notification.id, {
                include: [
                    {
                        model: User,
                        as: 'actor',
                        required: true,
                    },
                ],
            })
        } catch (error) {
            return handleServiceError(error)
        }
    }

    async destroy({
        recipientId,
        senderId,
        type,
    }: {
        recipientId: number
        senderId: number
        type: 'friend_request' | 'accept_friend_request' | 'message'
    }) {
        await Notification.destroy({
            where: {
                recipient_id: recipientId,
                actor_id: senderId,
                type,
            },
        })
    }

    async getNotifications({
        currentUserId,
        page,
        per_page,
        type,
    }: {
        currentUserId: number
        page: number
        per_page: number
        type: 'all' | 'unread'
    }) {
        try {
            const { rows: notifications, count: total } = await Notification.findAndCountAll({
                distinct: true,
                where: {
                    recipient_id: currentUserId,
                    ...(type === 'unread' && { is_read: false }),
                },
                include: [
                    {
                        model: User,
                        as: 'actor',
                        required: true,
                    },
                ],
                order: [['created_at', 'DESC']],
                limit: Number(per_page),
                offset: (Number(page) - 1) * Number(per_page),
            })

            return { notifications, total }
        } catch (error) {
            return handleServiceError(error)
        }
    }

    async markAsRead({ notificationId }: { notificationId: number }) {
        try {
            await Notification.update({ is_read: true }, { where: { id: notificationId } })
        } catch (error) {
            return handleServiceError(error)
        }
    }

    async markAsUnread({ notificationId }: { notificationId: number }) {
        try {
            await Notification.update({ is_read: false }, { where: { id: notificationId } })
        } catch (error) {
            return handleServiceError(error)
        }
    }

    async markAsSeen({ currentUserId }: { currentUserId: number }) {
        try {
            await Notification.update({ is_seen: true }, { where: { recipient_id: currentUserId } })
        } catch (error) {
            return handleServiceError(error)
        }
    }
}

export default new NotificationService()
