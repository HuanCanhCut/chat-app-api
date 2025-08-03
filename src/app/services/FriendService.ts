import { literal, Op, QueryTypes, Sequelize } from 'sequelize'
import { Literal } from 'sequelize/types/utils'
import { v4 as uuidv4 } from 'uuid'

import { AppError, ConflictError, InternalServerError, NotFoundError, UnprocessableEntityError } from '../errors/errors'
import { Conversation, ConversationMember, Friendships, Notification, User } from '../models'
import NotificationService from './NotificationService'
import { sequelize } from '~/config/database'
import { redisClient } from '~/config/redis'
import { ioInstance } from '~/config/socket'
import { RedisKey } from '~/enum/redis'
import { SocketEvent } from '~/enum/socketEvent'

interface SendMakeFriendRequestProps {
    userId: number
    friendId: number
    toWay?: boolean
}

class FriendService {
    friendShipJoinLiteral = (userId: number) => {
        return literal(`
                ((user.id = Friendships.friend_id AND Friendships.user_id = ${sequelize.escape(userId)}) 
                OR
                (user.id = Friendships.user_id AND Friendships.friend_id = ${sequelize.escape(userId)}))
            `)
    }

    sendMakeFriendRequest = async ({ userId, friendId, toWay = false }: SendMakeFriendRequestProps) => {
        try {
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
        } catch (error: any) {
            if (error instanceof AppError) {
                throw error
            }

            throw new InternalServerError({ message: error.message })
        }
    }

    async addFriend({ currentUserId, friendId }: { currentUserId: number; friendId: number }) {
        try {
            const hasUser = await User.findOne({ where: { id: friendId } })

            if (!hasUser) {
                throw new NotFoundError({ message: 'User not found' })
            }

            if (hasUser.id === currentUserId) {
                throw new ConflictError({ message: 'You cannot add yourself as a friend' })
            }

            const isFriend = await this.isFriend({ currentUserId, userId: friendId })

            if (isFriend) {
                throw new ConflictError({ message: 'User is already your friend' })
            }

            const isMakeFriendRequest = await this.sendMakeFriendRequest({
                userId: currentUserId,
                friendId: friendId,
                toWay: true,
            })

            if (isMakeFriendRequest) {
                throw new ConflictError({ message: 'You have already sent a friend request to this user' })
            }

            const newFriendship = await Friendships.create({
                user_id: currentUserId,
                friend_id: friendId,
            })

            if (!newFriendship) {
                throw new InternalServerError({ message: 'Failed to add friend' })
            }

            const notificationData = await NotificationService.create({
                recipientId: Number(friendId),
                type: 'friend_request',
                currentUserId: currentUserId,
                message: 'vừa gửi cho bạn một lời mời kết bạn',
            })

            // Send notification to user
            const socketIds = await redisClient.lRange(`${RedisKey.SOCKET_ID}${Number(friendId)}`, 0, -1)

            if (socketIds && socketIds.length > 0) {
                ioInstance?.to(socketIds).emit(SocketEvent.NEW_NOTIFICATION, notificationData)
            }
        } catch (error: any) {
            if (error instanceof AppError) {
                throw error
            }

            throw new InternalServerError({ message: error.message })
        }
    }

    async isFriend({ currentUserId, userId }: { currentUserId: number; userId: number }) {
        try {
            const isFriend = await Friendships.findOne({
                include: [
                    {
                        model: User,
                        as: 'user',
                        required: true,
                        attributes: {
                            exclude: ['password', 'email'],
                        },
                    },
                ],
                where: {
                    [Op.and]: [
                        { status: 'accepted' },
                        {
                            [Op.or]: [
                                {
                                    [Op.and]: [{ user_id: currentUserId }, { friend_id: userId }],
                                },
                                {
                                    [Op.and]: [{ friend_id: currentUserId }, { user_id: userId }],
                                },
                            ],
                        },
                    ],
                },
            })

            return !!isFriend
        } catch (error: any) {
            if (error instanceof AppError) {
                throw error
            }

            throw new InternalServerError({ message: error.message })
        }
    }

    async friendCount(userId: number) {
        try {
            const friendCount = await Friendships.count({
                where: {
                    status: 'accepted',
                    [Op.or]: [{ friend_id: Number(userId) }, { user_id: Number(userId) }],
                },
            })

            return friendCount
        } catch (error: any) {
            if (error instanceof AppError) {
                throw error
            }

            throw new InternalServerError({ message: error.message })
        }
    }

    async mutualFriendCount({ userId, friendIds }: { userId: number; friendIds: number[] }) {
        try {
            const mutualFriendCountQuery = `
                SELECT COUNT(*) AS mutual_friends_count FROM (
                    SELECT fs.friend_id AS friend
                    FROM friendships fs
                    WHERE fs.status = 'accepted' AND fs.user_id = :userId AND fs.friend_id IN (:friendIds)
                    
                    UNION ALL
                    
                    SELECT fs.user_id AS friend
                    FROM friendships fs
                    WHERE fs.status = 'accepted' AND fs.friend_id = :userId AND fs.user_id IN (:friendIds)
                ) AS mutual_friends_count
            `

            interface MutualFriendCount {
                mutual_friends_count: number
            }

            const mutualFriendCount = await sequelize.query<MutualFriendCount>(mutualFriendCountQuery, {
                replacements: { userId, friendIds },
                type: QueryTypes.SELECT,
            })

            return mutualFriendCount[0].mutual_friends_count
        } catch (error: any) {
            if (error instanceof AppError) {
                throw error
            }

            throw new InternalServerError({ message: error.message })
        }
    }

    async getAllFriends({
        currentUserId,
        userId,
        page,
        per_page,
        q,
    }: {
        currentUserId: number
        userId: number
        page: number
        per_page: number
        q?: string
    }) {
        try {
            interface UserInclude {
                attributes: {
                    exclude: string[]
                }
                model: typeof User
                as: string
                required: boolean
                on: Literal
                where?: Literal
                runHooks?: boolean
            }

            // Build the include for User, adding search if q is present
            const userInclude: UserInclude = {
                attributes: {
                    exclude: ['password', 'email'],
                },
                model: User,
                as: 'user',
                required: true,
                on: this.friendShipJoinLiteral(Number(userId)),
                runHooks: true,
            }

            if (q) {
                userInclude.where = sequelize.literal(
                    `MATCH(full_name) AGAINST(${sequelize.escape(q + '*')} IN BOOLEAN MODE)`,
                )
            }

            const [{ rows: friends, count }, currentUserFriends] = await Promise.all([
                Friendships.findAndCountAll({
                    distinct: true,
                    where: {
                        status: 'accepted',
                    },
                    include: [userInclude],
                    limit: Number(per_page),
                    offset: (Number(page) - 1) * Number(per_page),
                }),

                Friendships.findAll({
                    where: {
                        status: 'accepted',
                    },
                    attributes: ['id'],
                    include: [
                        {
                            attributes: {
                                exclude: ['password', 'email'],
                            },
                            model: User,
                            as: 'user',
                            required: true,
                            on: this.friendShipJoinLiteral(Number(currentUserId)),
                            runHooks: true,
                        },
                    ],
                    limit: Number(per_page),
                    offset: (Number(page) - 1) * Number(per_page),
                }),
            ])

            const currentFriendsIds = currentUserFriends.map((friend) => {
                const user = friend.get('user') as User

                return Number(user.id)
            })

            const promises = friends.map(async (friend) => {
                const user = friend.get('user') as User

                const mutualFriendCount = await this.mutualFriendCount({
                    userId: Number(user.id),
                    friendIds: currentFriendsIds,
                })

                if (user.id !== Number(currentUserId)) {
                    user.setDataValue('mutual_friends_count', mutualFriendCount)
                }
            })

            await Promise.all(promises)

            return { friends, count }
        } catch (error: any) {
            if (error instanceof AppError) {
                throw error
            }

            throw new InternalServerError({ message: error.message })
        }
    }

    async acceptFriend({ currentUserId, userId }: { currentUserId: number; userId: number }) {
        try {
            const [isFriend, isMakeFriendRequest] = await Promise.all([
                this.isFriend({ currentUserId: currentUserId, userId: Number(userId) }),
                this.sendMakeFriendRequest({ userId: Number(userId), friendId: currentUserId }),
            ])

            if (isFriend) {
                throw new ConflictError({ message: 'User is already your friend' })
            }

            if (!isMakeFriendRequest) {
                throw new NotFoundError({ message: 'Friend request not found' })
            }

            const updateSuccess = await isMakeFriendRequest.update({ status: 'accepted' })

            if (!updateSuccess) {
                throw new InternalServerError({ message: 'Failed to accept friend request' })
            }

            // Delete notification when accept friend request
            await NotificationService.destroy({
                recipientId: currentUserId,
                senderId: Number(userId),
                type: 'friend_request',
            })

            const notificationData = await NotificationService.create({
                recipientId: Number(userId),
                type: 'accept_friend_request',
                currentUserId: currentUserId,
                message: 'đã chấp nhận lời mời kết bạn',
            })

            const hasConversation = await Conversation.findOne({
                where: {
                    id: {
                        [Op.in]: sequelize.literal(`(
                            SELECT conversation_id
                            FROM conversation_members
                            WHERE user_id IN (${currentUserId}, ${Number(userId)})
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
                    } as any)

                    // add two members to conversation
                    if (conversation.id) {
                        await ConversationMember.create({
                            conversation_id: conversation.id,
                            user_id: currentUserId,
                            joined_at: new Date(),
                            role: 'member',
                        })

                        await ConversationMember.create({
                            conversation_id: conversation.id,
                            user_id: Number(userId),
                            joined_at: new Date(),
                            role: 'member',
                        })
                    }
                })
            }

            const socketIds = await redisClient.lRange(`${RedisKey.SOCKET_ID}${Number(userId)}`, 0, -1)

            if (socketIds && socketIds.length > 0) {
                ioInstance.to(socketIds).emit(SocketEvent.NEW_NOTIFICATION, notificationData)
            }
        } catch (error: any) {
            if (error instanceof AppError) {
                throw error
            }

            throw new InternalServerError({ message: error.message })
        }
    }

    async rejectFriendRequest({ currentUserId, senderId }: { currentUserId: number; senderId: number }) {
        try {
            // Check if the user has sent a friend request to the this user
            const isMakeFriendRequest = await this.sendMakeFriendRequest({
                userId: Number(senderId),
                friendId: currentUserId,
                toWay: false,
            })

            if (!isMakeFriendRequest) {
                throw new NotFoundError({ message: 'Friend request not found' })
            }

            const notification = await Notification.findOne({
                where: { recipient_id: currentUserId, sender_id: Number(senderId), type: 'friend_request' },
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

            const socketIds = await redisClient.lRange(`${RedisKey.SOCKET_ID}${Number(currentUserId)}`, 0, -1)

            if (socketIds && socketIds.length > 0) {
                ioInstance.to(socketIds).emit(SocketEvent.REMOVE_NOTIFICATION, { notification_id: notification?.id })
            }
        } catch (error: any) {
            if (error instanceof AppError) {
                throw error
            }

            throw new InternalServerError({ message: error.message })
        }
    }

    async unfriend({ currentUserId, friendId }: { currentUserId: number; friendId: number }) {
        try {
            const isFriend = await this.isFriend({ currentUserId: currentUserId, userId: Number(friendId) })

            if (!isFriend) {
                throw new UnprocessableEntityError({ message: 'User is not your friend' })
            }

            await Friendships.destroy({
                where: {
                    [Op.or]: [
                        { user_id: currentUserId, friend_id: Number(friendId) },
                        { user_id: Number(friendId), friend_id: currentUserId },
                    ],
                },
            })
        } catch (error: any) {
            if (error instanceof AppError) {
                throw error
            }

            throw new InternalServerError({ message: error.message })
        }
    }

    async cancelFriendRequest({ currentUserId, userId }: { currentUserId: number; userId: number }) {
        try {
            const isMakeFriendRequest = await this.sendMakeFriendRequest({
                userId: currentUserId,
                friendId: Number(userId),
            })

            if (!isMakeFriendRequest) {
                throw new NotFoundError({ message: 'Friend request not found' })
            }

            const socketIds = await redisClient.lRange(`${RedisKey.SOCKET_ID}${Number(userId)}`, 0, -1)

            const notification = await Notification.findOne({
                where: {
                    recipient_id: Number(userId),
                    sender_id: currentUserId,
                    type: 'friend_request',
                },
                attributes: ['id'],
            })

            if (socketIds && socketIds.length > 0) {
                ioInstance.to(socketIds).emit(SocketEvent.REMOVE_NOTIFICATION, { notification_id: notification?.id })
            }

            if (notification) {
                await Promise.all([
                    isMakeFriendRequest.destroy(),
                    Notification.destroy({ where: { id: notification?.id } }),
                ])
            } else {
                await isMakeFriendRequest.destroy()
            }
        } catch (error: any) {
            if (error instanceof AppError) {
                throw error
            }

            throw new InternalServerError({ message: error.message })
        }
    }

    async getFriendInvitation({
        currentUserId,
        page,
        per_page,
    }: {
        currentUserId: number
        page: number
        per_page: number
    }) {
        try {
            const { rows: friendInvitations, count } = await Friendships.findAndCountAll<any>({
                distinct: true,
                where: {
                    [Op.and]: [{ status: 'pending' }, { friend_id: currentUserId }],
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
                    runHooks: true,
                },
                limit: Number(per_page),
                offset: (Number(page) - 1) * Number(per_page),
            })

            return { friendInvitations, count }
        } catch (error: any) {
            if (error instanceof AppError) {
                throw error
            }

            throw new InternalServerError({ message: error.message })
        }
    }

    async searchFriend({
        currentUserId,
        query,
        page,
        per_page,
    }: {
        currentUserId: number
        query: string
        page: number
        per_page: number
    }) {
        try {
            return await this.getAllFriends({
                currentUserId,
                userId: currentUserId,
                page,
                per_page,
                q: query,
            })
        } catch (error: any) {
            if (error instanceof AppError) {
                throw error
            }

            throw new InternalServerError({ message: error.message })
        }
    }

    async getFriendsOnline({ currentUserId }: { currentUserId: number }) {
        try {
            // Get all keys for online users from Redis
            const onlineUserKeys = await redisClient.keys(`${RedisKey.SOCKET_ID}*`)

            if (!onlineUserKeys.length) {
                return [] // No one is online
            }

            // Extract user IDs from Redis keys
            const onlineUserIds = onlineUserKeys
                .map((key) => {
                    // Extract user ID from the Redis key format (socket_id:123)
                    const keyPrefix = `${RedisKey.SOCKET_ID}`
                    if (key.startsWith(keyPrefix)) {
                        const idStr = key.substring(keyPrefix.length)
                        return idStr ? parseInt(idStr) : null
                    }
                    return null
                })
                .filter((id): id is number => id !== null && id !== currentUserId)

            if (!onlineUserIds.length) {
                return [] // No other users are online
            }

            // Query only online friends
            const friends = await Friendships.findAll({
                attributes: ['id'],
                where: {
                    status: 'accepted',
                    [Op.or]: [{ user_id: { [Op.in]: onlineUserIds } }, { friend_id: { [Op.in]: onlineUserIds } }],
                },
                include: [
                    {
                        attributes: ['id'],
                        model: User,
                        as: 'user',
                        required: true,
                        nested: true,
                        on: this.friendShipJoinLiteral(Number(currentUserId)),
                        runHooks: true,
                    },
                ],
            })

            return friends
        } catch (error: any) {
            if (error instanceof AppError) {
                throw error
            }

            throw new InternalServerError({ message: error.message })
        }
    }
}

export default new FriendService()
