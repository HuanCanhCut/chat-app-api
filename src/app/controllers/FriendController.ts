import { Response, NextFunction } from 'express'

import { BadRequest, ConflictError, InternalServerError, NotFoundError } from '../errors/errors'
import { Friendships, User, Notification, Conversation, ConversationMember } from '../models'
import { Sequelize } from 'sequelize'
import { Op } from 'sequelize'
import { v4 as uuidv4 } from 'uuid'

import { NotificationEvent } from '../../enum/notification'
import { RedisKey } from '../../enum/redis'
import { redisClient } from '../../config/redis'
import { IRequest } from '~/type'
import { friendShipJoinLiteral } from '../utils/isFriend'
import checkIsFriend from '../utils/isFriend'
import sentMakeFriendRequest from '../utils/sentMakeFriendRequest'
import { sequelize } from '~/config/db'
import { io } from '~/config/socket'
import createNotification from '../utils/createNotification'

class FriendController {
    // Delete notification when reject friend request
    async destroyNotification(recipient_id: number, sender_id: number) {
        await Notification.destroy({
            where: {
                recipient_id,
                sender_id,
                type: 'friend_request',
            },
        })
    }

    // [POST] /users/:id/add
    async addFriend(req: IRequest, res: Response, next: NextFunction) {
        try {
            // id of user that want to add friend
            const { id } = req.params
            const decoded = req.decoded

            if (!id) {
                return next(new BadRequest({ message: 'User ID is required' }))
            }

            const hasUser = await User.findOne<any>({ where: { id } })

            if (!hasUser) {
                return next(new NotFoundError({ message: 'User not found' }))
            }

            if (hasUser.id === decoded.sub) {
                return next(new ConflictError({ message: 'You cannot add yourself as a friend' }))
            }

            const isFriend = await checkIsFriend(decoded.sub, Number(id))

            if (isFriend) {
                return next(new ConflictError({ message: 'User is already your friend' }))
            }

            const isMakeFriendRequest = await sentMakeFriendRequest({
                userId: decoded.sub,
                friendId: Number(id),
                toWay: true,
            })

            if (isMakeFriendRequest) {
                return next(new ConflictError({ message: 'You have already sent a friend request to this user' }))
            }

            const newFriendship = await Friendships.create({
                user_id: decoded.sub,
                friend_id: Number(id),
            })

            if (!newFriendship) {
                return next(new InternalServerError({ message: 'Failed to add friend' }))
            }

            const notificationData = await createNotification({
                recipientId: Number(id),
                type: 'friend_request',
                currentUserId: decoded.sub,
                message: 'vừa gửi cho bạn một lời mời kết bạn',
            })

            // Send notification to user
            const socketIds = await redisClient.lRange(`${RedisKey.SOCKET_ID}${Number(id)}`, 0, -1)

            if (socketIds && socketIds.length > 0) {
                for (const socketId of socketIds) {
                    io.to(socketId).emit(NotificationEvent.NEW_NOTIFICATION, notificationData)
                }
            }

            res.sendStatus(201)
        } catch (error: any) {
            return next(new InternalServerError({ message: error.message }))
        }
    }

    // [GET] /users/friends?page=&per_page=
    async getAllFriends(req: IRequest, res: Response, next: NextFunction) {
        try {
            const { page, per_page, user_id } = req.query

            if (!page || !per_page) {
                return next(new BadRequest({ message: 'Page and per_page are required' }))
            }

            const decoded = req.decoded

            // Check if the user is friend with the current user
            const sql = `
                    (CASE 
                        WHEN EXISTS (
                            SELECT 1
                            FROM 
                                friendships 
                            WHERE 
                                friendships.status = 'accepted'
                                AND (
                                    (friendships.user_id = ${sequelize.escape(decoded.sub)} AND friendships.friend_id = user.id)
                                    OR 
                                    (friendships.friend_id = ${sequelize.escape(decoded.sub)} AND friendships.user_id = user.id)
                                )
                        ) 
                        THEN "true"
                        ELSE "false"
                    END)
            `

            const { rows: friends, count } = await Friendships.findAndCountAll<any>({
                where: {
                    status: 'accepted',
                },
                include: {
                    attributes: {
                        include: [[sequelize.literal(sql), 'is_friend']],
                        exclude: ['password', 'email'],
                    },
                    model: User,
                    as: 'user',
                    required: true,
                    nested: true,
                    on: friendShipJoinLiteral(Number(user_id)),
                },
                limit: Number(per_page),
                offset: (Number(page) - 1) * Number(per_page),
            })

            // Convert is_friend from string to boolean
            for (const friend of friends) {
                if (friend) {
                    friend.dataValues.user.dataValues.is_friend = friend.dataValues.user.dataValues.is_friend === 'true'
                }
            }

            res.json({
                data: friends,
                meta: {
                    pagination: {
                        total: count,
                        count: friends.length,
                        per_page: Number(per_page),
                        current_page: Number(page),
                        total_pages: Math.ceil(count / Number(per_page)),
                    },
                },
            })
        } catch (error: any) {
            return next(new InternalServerError({ message: error.message }))
        }
    }

    // [POST] /users/:id/accept
    async acceptFriend(req: IRequest, res: Response, next: NextFunction) {
        try {
            const { id } = req.params
            const decoded = req.decoded

            if (!id) {
                return next(new BadRequest({ message: 'User ID is required' }))
            }

            if (decoded.sub === Number(id)) {
                return next(new BadRequest({ message: 'You cannot accept yourself' }))
            }

            const [isFriend, isMakeFriendRequest] = await Promise.all([
                checkIsFriend(decoded.sub, Number(id)),
                sentMakeFriendRequest({ userId: Number(id), friendId: decoded.sub }),
            ])

            if (isFriend) {
                return next(new ConflictError({ message: 'User is already your friend' }))
            }

            if (!isMakeFriendRequest) {
                return next(new NotFoundError({ message: 'Friend request not found' }))
            }

            const updateSuccess = await isMakeFriendRequest.update({ status: 'accepted' })

            if (!updateSuccess) {
                return next(new InternalServerError({ message: 'Failed to accept friend request' }))
            }

            // Delete notification when accept friend request
            await Notification.destroy({
                where: {
                    recipient_id: decoded.sub,
                    sender_id: Number(id),
                    type: 'friend_request',
                },
            })

            const notificationData = await createNotification({
                recipientId: Number(id),
                type: 'accept_friend_request',
                currentUserId: decoded.sub,
                message: 'đã chấp nhận lời mời kết bạn',
            })

            const hasConversation = await Conversation.findOne({
                where: {
                    id: {
                        [Op.in]: sequelize.literal(`(
                            SELECT conversation_id
                            FROM conversation_members
                            WHERE user_id IN (${decoded.sub}, ${Number(id)})
                            GROUP BY conversation_id
                            HAVING COUNT(DISTINCT user_id) = 2
                        )`),
                    },
                    is_group: false,
                },
                attributes: ['id'],
            })

            if (!hasConversation) {
                await sequelize.transaction(async () => {
                    // create conversation between two users
                    const conversation = await Conversation.create({
                        uuid: uuidv4(),
                        is_group: false,
                    })

                    // add two members to conversation
                    if (conversation.id) {
                        await ConversationMember.create({
                            conversation_id: conversation.id,
                            user_id: decoded.sub,
                            joined_at: new Date(),
                        })

                        await ConversationMember.create({
                            conversation_id: conversation.id,
                            user_id: Number(id),
                            joined_at: new Date(),
                        })
                    }
                })
            }

            const socketIds = await redisClient.lRange(`${RedisKey.SOCKET_ID}${Number(id)}`, 0, -1)

            if (socketIds && socketIds.length > 0) {
                for (const socketId of socketIds) {
                    io.to(socketId).emit(NotificationEvent.NEW_NOTIFICATION, notificationData)
                }
            }

            res.sendStatus(200)
        } catch (error: any) {
            return next(new InternalServerError({ message: error.message }))
        }
    }

    // [POST] /users/:id/reject
    async rejectFriendRequest(req: IRequest, res: Response, next: NextFunction) {
        try {
            const { id: sender_id } = req.params
            const decoded = req.decoded

            if (!sender_id) {
                return next(new BadRequest({ message: 'User ID is required' }))
            }

            if (decoded.sub === Number(sender_id)) {
                return next(new BadRequest({ message: 'You cannot reject yourself' }))
            }

            // Check if the user has sent a friend request to the this user
            const isMakeFriendRequest = await sentMakeFriendRequest({
                userId: Number(sender_id),
                friendId: decoded.sub,
                toWay: false,
            })

            if (!isMakeFriendRequest) {
                return next(new NotFoundError({ message: 'Friend request not found' }))
            }

            const notification = await Notification.findOne({
                where: { recipient_id: decoded.sub, sender_id: Number(sender_id), type: 'friend_request' },
                attributes: ['id'],
            })

            await Promise.all([
                isMakeFriendRequest.destroy(),
                Notification.destroy({
                    where: {
                        id: notification?.id,
                    },
                }),
            ])

            const socketIds = await redisClient.lRange(`${RedisKey.SOCKET_ID}${Number(decoded.sub)}`, 0, -1)

            if (socketIds && socketIds.length > 0) {
                for (const socketId of socketIds) {
                    io.to(socketId).emit(NotificationEvent.REMOVE_NOTIFICATION, { notificationId: notification?.id })
                }
            }

            res.sendStatus(200)
        } catch (error: any) {
            return next(new InternalServerError({ message: error.message }))
        }
    }

    // [DELETE] /users/:id/unfriend
    async unfriend(req: IRequest, res: Response, next: NextFunction) {
        try {
            const { id } = req.params
            const decoded = req.decoded

            if (!id) {
                return next(new BadRequest({ message: 'User ID is required' }))
            }

            if (decoded.sub === Number(id)) {
                return next(new BadRequest({ message: 'You cannot unfriend yourself' }))
            }

            const isFriend = await checkIsFriend(decoded.sub, Number(id))

            if (!isFriend) {
                return next(new BadRequest({ message: 'User is not your friend' }))
            }

            await Friendships.destroy({
                where: {
                    [Op.or]: [
                        { user_id: decoded.sub, friend_id: Number(id) },
                        { user_id: Number(id), friend_id: decoded.sub },
                    ],
                },
            })

            res.sendStatus(200)
        } catch (error: any) {
            return next(new InternalServerError({ message: error.message }))
        }
    }

    // [POST] /users/:id/cancel
    async cancelFriendRequest(req: IRequest, res: Response, next: NextFunction) {
        try {
            const { id } = req.params
            const decoded = req.decoded

            if (!id) {
                return next(new BadRequest({ message: 'User ID is required' }))
            }

            if (decoded.sub === Number(id)) {
                return next(new BadRequest({ message: 'You cannot cancel friend request to yourself' }))
            }

            const isMakeFriendRequest = await sentMakeFriendRequest({
                userId: decoded.sub,
                friendId: Number(id),
            })

            if (!isMakeFriendRequest) {
                return next(new NotFoundError({ message: 'Friend request not found' }))
            }

            const socketIds = await redisClient.lRange(`${RedisKey.SOCKET_ID}${Number(id)}`, 0, -1)

            const notification = await Notification.findOne({
                where: {
                    recipient_id: id,
                    sender_id: decoded.sub,
                    type: 'friend_request',
                },
                attributes: ['id'],
            })

            if (socketIds && socketIds.length > 0) {
                for (const socketId of socketIds) {
                    io.to(socketId).emit(NotificationEvent.REMOVE_NOTIFICATION, { notificationId: notification?.id })
                }
            }

            if (notification) {
                await Promise.all([
                    isMakeFriendRequest.destroy(),
                    Notification.destroy({ where: { id: notification?.id } }),
                ])
            } else {
                await isMakeFriendRequest.destroy()
            }

            res.sendStatus(200)
        } catch (error: any) {
            return next(new InternalServerError({ message: error.message }))
        }
    }

    // [POST] /users/friend-invitation?page=&per_page=
    async getFriendInvitation(req: IRequest, res: Response, next: NextFunction) {
        try {
            const decoded = req.decoded
            const { page, per_page } = req.query

            if (!page || !per_page) {
                return next(new BadRequest({ message: 'Page and per_page are required' }))
            }

            // Danh sách lời mời kết bạn
            const { rows: friendInvitations, count } = await Friendships.findAndCountAll<any>({
                where: {
                    [Op.and]: [{ status: 'pending' }, { friend_id: decoded.sub }],
                },
                include: {
                    model: User,
                    as: 'user',
                    required: true,
                    where: {
                        id: Sequelize.col('Friendships.user_id'),
                    },
                    attributes: {
                        exclude: ['password', 'email'],
                    },
                },
                limit: Number(per_page),
                offset: (Number(page) - 1) * Number(per_page),
            })

            res.json({
                data: friendInvitations,
                meta: {
                    pagination: {
                        total: count,
                        count: friendInvitations.length,
                        per_page: Number(per_page),
                        current_page: Number(page),
                        total_pages: Math.ceil(count / Number(per_page)),
                    },
                },
            })
        } catch (error: any) {
            return next(new InternalServerError({ message: error.message }))
        }
    }
}

export default new FriendController()
