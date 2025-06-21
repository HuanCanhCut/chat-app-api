import { QueryTypes } from 'sequelize'
import { Op } from 'sequelize'

import { SocketEvent } from '~/enum/socketEvent'
import { redisClient } from '~/config/redis'
import { RedisKey } from '~/enum/redis'
import { Conversation, Message, MessageStatus } from '../models'
import { ConversationMember } from '../models'
import { User } from '../models'
import { sequelize } from '~/config/database'
import MessageReaction from '../models/MessageReactionModel'
import MessageService from '../services/MessageService'
import logger from '~/logger/logger'
import { Socket } from 'socket.io'
import { ioInstance } from '~/config/socket'

class SocketMessageService {
    private socket: Socket
    private currentUserId: number

    constructor(socket: Socket) {
        this.socket = socket
        this.currentUserId = socket.data.decoded.sub
    }

    saveMessageToDatabase = async ({
        conversationId,
        senderId,
        userIds,
        message,
        type = 'text',
        parent_id = null,
    }: {
        conversationId: number
        senderId: number
        userIds: { id: number; is_online: boolean }[]
        message: string
        type: 'text' | 'image' | 'icon'
        parent_id: number | null
    }) => {
        const transaction = await sequelize.transaction()
        try {
            // save message to database
            const newMessage = await Message.create({
                conversation_id: conversationId,
                sender_id: senderId,
                content: message,
                type,
                parent_id: parent_id || null,
            })

            if (newMessage.id) {
                for (const userId of userIds) {
                    await MessageStatus.create({
                        message_id: newMessage.id,
                        receiver_id: userId.id,
                        status: userId.is_online ? 'delivered' : 'sent',
                    })
                }
            }

            await transaction.commit()

            const messageResponse = await Message.findByPk<any>(newMessage.id, {
                attributes: {
                    exclude: ['parent_id'],
                },
                include: [
                    {
                        model: User,
                        as: 'sender',
                        required: true,
                        attributes: {
                            include: [[MessageService.isReadLiteral(senderId), 'is_read']],
                            exclude: ['password', 'email'],
                        },
                    },
                    {
                        model: MessageStatus,
                        as: 'message_status',
                        include: [
                            {
                                model: User,
                                as: 'receiver',
                                attributes: {
                                    include: [
                                        [
                                            sequelize.literal(`
                                                (
                                                    SELECT messages.id
                                                    FROM messages
                                                    INNER JOIN message_statuses ON message_statuses.message_id = messages.id
                                                    WHERE message_statuses.receiver_id = message_status.receiver_id AND
                                                        message_statuses.status = 'read'
                                                    ORDER BY messages.id DESC
                                                    LIMIT 1
                                                )
                                            `),
                                            'last_read_message_id',
                                        ],
                                    ],
                                    exclude: ['password', 'email'],
                                },
                            },
                        ],
                    },
                    {
                        model: Message,
                        as: 'parent',
                        required: false,
                        where: {
                            // Get all messages except messages that have been revoked for-me by the current user
                            [Op.not]: {
                                id: {
                                    [Op.in]: sequelize.literal(`
                                        (
                                            SELECT message_id
                                            FROM message_statuses
                                            WHERE message_statuses.revoke_type = 'for-me'
                                            AND message_statuses.message_id = parent.id
                                            AND message_statuses.receiver_id = ${sequelize.escape(this.currentUserId)}
                                        )
                                    `),
                                },
                            },
                        },
                        attributes: {
                            exclude: ['content'],
                            include: [
                                [
                                    sequelize.literal(`
                                        CASE
                                            WHEN EXISTS (
                                                SELECT 1 FROM message_statuses
                                                WHERE message_statuses.message_id = parent.id
                                                AND message_statuses.receiver_id = ${sequelize.escape(this.currentUserId)}
                                                AND message_statuses.is_revoked = 1
                                            ) THEN NULL
                                            ELSE parent.content
                                        END
                                    `),
                                    'content',
                                ],
                            ],
                        },
                    },
                ],
            })

            const isRead = messageResponse.dataValues.is_read === 1

            return { ...messageResponse.dataValues, is_read: isRead }
        } catch (error) {
            if (transaction) {
                await transaction.rollback()
            }
            logger.error('SAVE_MESSAGE_TO_DATABASE', error)
        }
    }

    getConversation = async ({ conversationUuid }: { conversationUuid: string }) => {
        try {
            // get conversation from database
            const conversation = await Conversation.findOne({
                where: {
                    uuid: conversationUuid,
                },
                include: [
                    {
                        model: ConversationMember,
                        as: 'conversation_members',
                        include: [
                            {
                                model: User,
                                as: 'user',
                                attributes: {
                                    exclude: ['password', 'email'],
                                },
                            },
                        ],
                    },
                ],
            })
            return conversation
        } catch (error) {
            console.log(error)
        }
    }

    getUsersOnlineStatus = async (conversationUuid: string) => {
        // get all users online in a conversation
        const allUserOfConversation = await User.findAll({
            attributes: ['id'],
            include: [
                {
                    model: ConversationMember,
                    required: true,
                    as: 'conversation_members',
                    include: [
                        {
                            model: Conversation,
                            required: true,
                            as: 'conversation',
                            where: { uuid: conversationUuid },
                        },
                    ],
                },
            ],
        })

        const userIds = await Promise.all(
            allUserOfConversation.map(async (user: any) => {
                const isOnlineCache = await redisClient.get(`${RedisKey.USER_ONLINE}${user.get('id')}`)

                return {
                    id: user.get('id') as number,
                    is_online: isOnlineCache ? (JSON.parse(isOnlineCache).is_online as boolean) : false,
                }
            }),
        )

        return userIds
    }

    JOIN_ROOM = async (conversation_uuid: string) => {
        // Get all socket ids of user from Redis
        const socketIds = await redisClient.lRange(`${RedisKey.SOCKET_ID}${this.currentUserId}`, 0, -1)

        // if user in room, not join again
        const userInRoom = await redisClient.get(`user_${this.currentUserId}_in_room_${conversation_uuid}`)

        if (userInRoom) {
            return
        }

        if (socketIds && socketIds.length > 0) {
            for (const socketId of socketIds) {
                const userSocket = ioInstance.sockets.sockets.get(socketId) // Get socket from socketId
                if (userSocket) {
                    userSocket.join(conversation_uuid) // Socket join room
                }
            }
        }

        // Save user status that has joined room to Redis
        await redisClient.set(`user_${this.currentUserId}_in_room_${conversation_uuid}`, 'true')
    }

    NEW_MESSAGE = async ({
        conversation_uuid,
        message,
        type = 'text',
        parent_id = null,
    }: {
        conversation_uuid: string
        message: string
        type: 'text' | 'image' | 'icon'
        parent_id: number | null
    }) => {
        try {
            const conversation = await Conversation.findOne({
                attributes: ['id'],
                where: { uuid: conversation_uuid },
            })

            if (!conversation?.dataValues?.id) {
                // emit fail message status
                return
            }

            const userIds = await this.getUsersOnlineStatus(conversation_uuid)

            const newMessage = await this.saveMessageToDatabase({
                conversationId: conversation.dataValues.id,
                senderId: this.currentUserId,
                userIds,
                message,
                type,
                parent_id,
            })

            if (!newMessage) {
                // emit fail message status
                return
            }

            // emit message to room
            const conversationCache = await redisClient.get(`${RedisKey.CONVERSATION_UUID}${conversation_uuid}`)

            if (conversationCache) {
                const conversation = {
                    ...JSON.parse(conversationCache),
                    last_message: newMessage,
                }

                ioInstance.to(conversation_uuid).emit(SocketEvent.NEW_MESSAGE, { conversation })
            } else {
                // get conversation from database
                const conversation = await this.getConversation({
                    conversationUuid: conversation_uuid,
                })

                if (conversation) {
                    // Groups can always change information about members, avatars... so they can't be cached.
                    if (!conversation.get('is_group')) {
                        redisClient.set(
                            `${RedisKey.CONVERSATION_UUID}${conversation_uuid}`,
                            JSON.stringify(conversation),
                            {
                                // 1 hour
                                EX: 60 * 60,
                            },
                        )
                    }

                    const conversationData = {
                        ...conversation.dataValues,
                        last_message: newMessage,
                    }

                    ioInstance.to(conversation_uuid).emit(SocketEvent.NEW_MESSAGE, { conversation: conversationData })
                }
            }

            for (const user of userIds) {
                if (user.id === this.currentUserId) {
                    continue
                }

                const isUserInRoom = await redisClient.get(`user_${user.id}_in_room_${conversation_uuid}`)

                // user online but not in the room
                if (!isUserInRoom && user.is_online) {
                    const socketIds = await redisClient.lRange(`${RedisKey.SOCKET_ID}${user.id}`, 0, -1)

                    if (socketIds && socketIds.length > 0) {
                        const conversationCache = await redisClient.get(
                            `${RedisKey.CONVERSATION_UUID}${conversation_uuid}`,
                        )

                        if (conversationCache) {
                            const conversation = {
                                ...JSON.parse(conversationCache),
                                last_message: newMessage,
                            }
                            ioInstance.to(socketIds).emit(SocketEvent.NEW_MESSAGE, { conversation })
                        } else {
                            try {
                                // get conversation from database
                                const conversation = await this.getConversation({
                                    conversationUuid: conversation_uuid,
                                })

                                if (conversation) {
                                    redisClient.set(
                                        `${RedisKey.CONVERSATION_UUID}${conversation_uuid}`,
                                        JSON.stringify(conversation),
                                        {
                                            // 1 hour
                                            EX: 60 * 60,
                                        },
                                    )

                                    const conversationData = {
                                        ...conversation.dataValues,
                                        last_message: newMessage,
                                    }

                                    for (const socketId of socketIds) {
                                        ioInstance.to(socketId).emit(SocketEvent.NEW_MESSAGE, {
                                            conversation: conversationData,
                                        })
                                    }
                                }
                            } catch (error) {
                                console.log(error)
                            }
                        }
                    } else {
                        // delete socket id from redis if socket id not exist
                        redisClient.lRem(`${RedisKey.SOCKET_ID}${user.id}`, 0, this.socket.id)
                    }
                }
            }
        } catch (error) {
            logger.error('NEW_MESSAGE', error)
        }
    }

    READ_MESSAGE = async ({ conversation_uuid, message_id }: { conversation_uuid: string; message_id: number }) => {
        try {
            // update message status to read
            await sequelize.query(
                `
                    UPDATE
                        message_statuses
                    INNER JOIN
                        messages ON messages.id = message_statuses.message_id
                    INNER JOIN
                        conversations ON conversations.id = messages.conversation_id
                    SET
                        message_statuses.status = 'read',
                        message_statuses.read_at = NOW()
                    WHERE
                        conversations.uuid = :conversationUuid
                        AND message_statuses.receiver_id = :receiverId
            `,
                {
                    replacements: {
                        conversationUuid: conversation_uuid,
                        receiverId: this.currentUserId,
                    },
                    type: QueryTypes.UPDATE,
                },
            )

            const conversation = await Conversation.findOne({
                where: { uuid: conversation_uuid },
                attributes: ['id'],
            })

            if (!conversation?.dataValues?.id) {
                return
            }

            const message = await Message.findByPk(message_id, {
                include: [
                    {
                        model: MessageStatus,
                        required: true,
                        as: 'message_status',
                        include: [
                            {
                                model: User,
                                as: 'receiver',
                                attributes: {
                                    include: [
                                        [
                                            MessageService.lastReadMessageIdLiteral(
                                                this.currentUserId,
                                                conversation.get('id')!,
                                            ),
                                            'last_read_message_id',
                                        ],
                                    ],
                                    exclude: ['password', 'email'],
                                },
                            },
                        ],
                    },
                    {
                        model: User,
                        as: 'sender',
                        required: true,
                        attributes: {
                            exclude: ['password', 'email'],
                        },
                    },
                    {
                        model: Message,
                        as: 'parent',
                        required: false,
                        where: {
                            // Get all messages except messages that have been revoked for-me by the current user
                            [Op.not]: {
                                id: {
                                    [Op.in]: sequelize.literal(`
                                        (
                                            SELECT message_id
                                            FROM message_statuses
                                            WHERE message_statuses.revoke_type = 'for-me'
                                            AND message_statuses.message_id = parent.id
                                            AND message_statuses.receiver_id = ${sequelize.escape(this.currentUserId)}
                                        )
                                    `),
                                },
                            },
                        },
                        include: [
                            {
                                model: User,
                                as: 'sender',
                                attributes: { exclude: ['password', 'email'] },
                            },
                        ],
                    },
                ],
            })

            if (message) {
                await MessageService.replaceContentAndIsRead(message, this.currentUserId)
            }

            ioInstance
                .to(conversation_uuid)
                .emit(SocketEvent.UPDATE_READ_MESSAGE, { message, user_read_id: this.currentUserId })

            const userIds = await this.getUsersOnlineStatus(conversation_uuid)

            for (const user of userIds) {
                if (user.id === this.currentUserId) {
                    continue
                }

                if (user.is_online) {
                    const socketIds = await redisClient.lRange(`${RedisKey.SOCKET_ID}${user.id}`, 0, -1)

                    if (socketIds && socketIds.length > 0) {
                        ioInstance.to(socketIds).emit(SocketEvent.UPDATE_READ_MESSAGE, {
                            message,
                            user_read_id: this.currentUserId,
                        })
                    }
                }
            }
        } catch (error) {
            logger.error('READ_MESSAGE', error)
        }
    }

    REACT_MESSAGE = async ({
        conversation_uuid,
        message_id,
        react,
        user_react_id,
    }: {
        conversation_uuid: string
        message_id: number
        react: string
        user_react_id: number
    }) => {
        try {
            const conversationMembers = await User.findAll({
                attributes: ['id'],
                include: [
                    {
                        model: ConversationMember,
                        required: true,
                        as: 'conversation_members',
                        attributes: ['user_id'],
                        include: [
                            {
                                model: Conversation,
                                required: true,
                                as: 'conversation',
                                where: { uuid: conversation_uuid },
                                attributes: ['id'],
                            },
                        ],
                    },
                ],
            })

            const isAMember = conversationMembers.some((member) => member.get('id') === user_react_id)

            if (!isAMember) {
                return
            }

            const hasReaction = await MessageReaction.findOne({
                where: {
                    message_id: message_id,
                    user_id: user_react_id,
                },
            })

            let messageReaction: any = null

            if (hasReaction) {
                hasReaction.react = react
                messageReaction = await hasReaction.save()
            } else {
                messageReaction = await MessageReaction.create({
                    message_id: message_id,
                    react,
                    user_id: user_react_id,
                })
            }

            const [reaction, top_reactions, total_reactions] = await Promise.all([
                MessageReaction.findByPk(messageReaction.id, {
                    include: [
                        {
                            model: User,
                            as: 'user_reaction',
                            attributes: {
                                exclude: ['password', 'email'],
                            },
                        },
                    ],
                }),

                MessageReaction.findAll({
                    where: {
                        message_id: message_id,
                    },
                    include: [
                        {
                            model: User,
                            as: 'user_reaction',
                            attributes: {
                                exclude: ['password', 'email'],
                            },
                        },
                    ],
                    attributes: ['react'],
                    group: ['react'],
                    order: [[sequelize.fn('COUNT', sequelize.col('react')), 'DESC']],
                    limit: 2,
                }),

                MessageReaction.count({
                    where: {
                        message_id: message_id,
                    },
                }),
            ])

            ioInstance
                .to(conversation_uuid)
                .emit(SocketEvent.REACT_MESSAGE, { reaction, top_reactions, total_reactions })
        } catch (error) {
            logger.error('REACT_MESSAGE', error)
        }
    }

    REMOVE_REACTION = async ({
        conversation_uuid,
        message_id,
        user_reaction_id,
        react,
    }: {
        conversation_uuid: string
        message_id: number
        user_reaction_id: number
        react: string
    }) => {
        try {
            const conversationMembers = await User.findAll({
                attributes: ['id'],
                include: [
                    {
                        model: ConversationMember,
                        required: true,
                        as: 'conversation_members',
                        attributes: ['user_id'],
                        include: [
                            {
                                model: Conversation,
                                required: true,
                                as: 'conversation',
                                where: { uuid: conversation_uuid },
                                attributes: ['id'],
                            },
                        ],
                    },
                ],
            })

            const isAMember = conversationMembers.some((member) => member.get('id') === user_reaction_id)

            if (!isAMember) {
                return
            }

            const [, top_reactions, total_reactions] = await Promise.all([
                await MessageReaction.destroy({
                    where: {
                        message_id: message_id,
                        user_id: user_reaction_id,
                    },
                }),

                MessageReaction.findAll({
                    where: {
                        message_id: message_id,
                    },
                    include: [
                        {
                            model: User,
                            as: 'user_reaction',
                            attributes: [[sequelize.col('full_name'), 'user_reaction_name']],
                        },
                    ],
                    attributes: ['react'],
                    group: ['react'],
                    order: [[sequelize.fn('COUNT', sequelize.col('react')), 'DESC']],
                    limit: 2,
                }),

                MessageReaction.count({
                    where: {
                        message_id: message_id,
                    },
                }),
            ])

            ioInstance.to(conversation_uuid).emit(SocketEvent.REMOVE_REACTION, {
                message_id,
                react,
                top_reactions,
                total_reactions,
            })
        } catch (error) {
            logger.error('REMOVE_REACTION', error)
        }
    }

    MESSAGE_TYPING = async ({
        conversation_uuid,
        user_id,
        is_typing,
    }: {
        conversation_uuid: string
        user_id: number
        is_typing: boolean
    }) => {
        try {
            this.socket.broadcast.to(conversation_uuid).emit(SocketEvent.MESSAGE_TYPING, {
                user_id,
                is_typing,
                conversation_uuid,
            })
        } catch (error) {
            logger.error('MESSAGE_TYPING', error)
        }
    }

    DISCONNECT = async () => {
        // Delete all rooms that user has joined from Redis
        redisClient.keys(`user_${this.currentUserId}_in_room_*`).then((keys) => {
            keys.forEach((key) => redisClient.del(key))
        })
    }
}

export default SocketMessageService
