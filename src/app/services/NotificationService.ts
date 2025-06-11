import { AppError, InternalServerError, NotFoundError } from '../errors/errors'
import { Notification, User } from '../models'

interface ICreateNotification {
    recipientId: number
    type: 'friend_request' | 'accept_friend_request' | 'message'
    currentUserId: number
    message: 'vừa gửi cho bạn một lời mời kết bạn' | 'đã chấp nhận lời mời kết bạn'
}

class NotificationService {
    async create({ recipientId, type, currentUserId, message }: ICreateNotification) {
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
        } catch (error: any) {
            if (error instanceof AppError) {
                throw error
            }

            throw new InternalServerError({ message: error.message })
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
                sender_id: senderId,
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
                        as: 'sender_user',
                        required: true,
                        attributes: {
                            exclude: ['password', 'email'],
                        },
                    },
                ],
                order: [['created_at', 'DESC']],
                limit: Number(per_page),
                offset: (Number(page) - 1) * Number(per_page),
            })

            return { notifications, total }
        } catch (error: any) {
            if (error instanceof AppError) {
                throw error
            }

            throw new InternalServerError({ message: error.message })
        }
    }

    async markAsRead({ notificationId }: { notificationId: number }) {
        try {
            await Notification.update({ is_read: true }, { where: { id: notificationId } })
        } catch (error: any) {
            if (error instanceof AppError) {
                throw error
            }

            throw new InternalServerError({ message: error.message })
        }
    }

    async markAsUnread({ notificationId }: { notificationId: number }) {
        try {
            await Notification.update({ is_read: false }, { where: { id: notificationId } })
        } catch (error: any) {
            if (error instanceof AppError) {
                throw error
            }

            throw new InternalServerError({ message: error.message })
        }
    }

    async markAsSeen({ currentUserId }: { currentUserId: number }) {
        try {
            await Notification.update({ is_seen: true }, { where: { recipient_id: currentUserId } })
        } catch (error: any) {
            if (error instanceof AppError) {
                throw error
            }

            throw new InternalServerError({ message: error.message })
        }
    }
}

export default new NotificationService()
