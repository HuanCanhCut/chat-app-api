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
import socketManager from './socketManager'

const listen = () => {
    const socket = socketManager.socket
    const io = socketManager.io
    const currentUserId = socketManager.decoded.sub

    const saveMessageToDatabase = async ({
        conversationId,
        senderId,
        userIds,
        message,
        type = 'text',
        status,
        parent_id = null,
    }: {
        conversationId: number
        senderId: number
        userIds: number[]
        message: string
        status: 'sent' | 'delivered' | 'read'
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
                        receiver_id: userId,
                        status,
                    })
                }
            }

            await transaction.commit()

            const is_read_sql = `
            CASE 
                WHEN EXISTS (
                    SELECT 1
                    FROM message_statuses
                    WHERE message_statuses.message_id = Message.id
                    AND message_statuses.receiver_id = ${senderId}
                    AND message_statuses.status = 'read'
                ) THEN TRUE 
                ELSE FALSE 
            END
            `

            // last message
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
                            include: [[sequelize.literal(is_read_sql), 'is_read']],
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
                                            AND message_statuses.receiver_id = ${sequelize.escape(currentUserId)}
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
                                                AND message_statuses.receiver_id = ${sequelize.escape(currentUserId)}
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
            console.log(error)
        }
    }

    const getConversation = async ({ conversationUuid }: { conversationUuid: string }) => {
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

    const JOIN_ROOM = async (conversationUuid: string) => {
        // Get all socket ids of user from Redis
        const socketIds = await redisClient.lRange(`${RedisKey.SOCKET_ID}${currentUserId}`, 0, -1)

        // if user in room, not join again
        const userInRoom = await redisClient.get(`user_${currentUserId}_in_room_${conversationUuid}`)

        if (userInRoom) {
            return
        }

        if (socketIds && socketIds.length > 0) {
            for (const socketId of socketIds) {
                const userSocket = io.sockets.sockets.get(socketId) // Get socket from socketId
                if (userSocket) {
                    userSocket.join(conversationUuid) // Socket join room
                }
            }
        }

        // Save user status that has joined room to Redis
        await redisClient.set(`user_${currentUserId}_in_room_${conversationUuid}`, 'true')
    }

    const NEW_MESSAGE = async ({
        conversationUuid,
        message,
        type = 'text',
        parent_id = null,
    }: {
        conversationUuid: string
        message: string
        type: 'text' | 'image' | 'icon'
        parent_id: number | null
    }) => {
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

        const conversation = await Conversation.findOne({
            attributes: ['id'],
            where: { uuid: conversationUuid },
        })

        if (!conversation?.dataValues?.id) {
            // emit fail message status
            return
        }

        const userIds = await Promise.all(
            allUserOfConversation.map(async (user: any) => {
                const isOnlineCache = await redisClient.get(`${RedisKey.USER_ONLINE}${user.get('id')}`)

                return {
                    id: user.get('id'),
                    is_online: isOnlineCache ? JSON.parse(isOnlineCache).is_online : false,
                }
            }),
        )

        const newMessage = await saveMessageToDatabase({
            conversationId: conversation.dataValues.id,
            senderId: currentUserId,
            userIds: userIds.map((user) => user.id),
            message,
            type,
            status: 'delivered',
            parent_id,
        })

        if (!newMessage) {
            // emit fail message status
            return
        }

        // emit message to room
        const conversationCache = await redisClient.get(`${RedisKey.CONVERSATION_UUID}${conversationUuid}`)

        if (conversationCache) {
            const conversation = {
                ...JSON.parse(conversationCache),
                last_message: newMessage,
            }

            io.to(conversationUuid).emit(SocketEvent.NEW_MESSAGE, { conversation })
        } else {
            // get conversation from database
            const conversation = await getConversation({
                conversationUuid,
            })

            if (conversation) {
                redisClient.set(`${RedisKey.CONVERSATION_UUID}${conversationUuid}`, JSON.stringify(conversation), {
                    // 1 hour
                    EX: 60 * 60,
                })

                const conversationData = {
                    ...conversation.dataValues,
                    last_message: newMessage,
                }

                io.to(conversationUuid).emit(SocketEvent.NEW_MESSAGE, { conversation: conversationData })
            }
        }

        for (const user of userIds) {
            if (user.id === currentUserId) {
                continue
            }

            const isUserInRoom = await redisClient.get(`user_${user.id}_in_room_${conversationUuid}`)

            // user online but not in the room
            if (!isUserInRoom && user.is_online) {
                const socketIds = await redisClient.lRange(`${RedisKey.SOCKET_ID}${user.id}`, 0, -1)

                if (socketIds && socketIds.length > 0) {
                    const conversationCache = await redisClient.get(`${RedisKey.CONVERSATION_UUID}${conversationUuid}`)

                    if (conversationCache) {
                        const conversation = {
                            ...JSON.parse(conversationCache),
                            last_message: newMessage,
                        }
                        for (const socketId of socketIds) {
                            io.to(socketId).emit(SocketEvent.NEW_MESSAGE, { conversation })
                        }
                    } else {
                        try {
                            // get conversation from database
                            const conversation = await getConversation({
                                conversationUuid,
                            })

                            if (conversation) {
                                redisClient.set(
                                    `${RedisKey.CONVERSATION_UUID}${conversationUuid}`,
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
                                    io.to(socketId).emit(SocketEvent.NEW_MESSAGE, {
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
                    redisClient.lRem(`${RedisKey.SOCKET_ID}${user.id}`, 0, socket.id)
                }
            }
        }
    }

    const READ_MESSAGE = async ({ conversationUuid, messageId }: { conversationUuid: string; messageId: number }) => {
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
                        conversationUuid,
                        receiverId: currentUserId,
                    },
                    type: QueryTypes.UPDATE,
                },
            )

            const conversation = await Conversation.findOne({
                where: { uuid: conversationUuid },
                attributes: ['id'],
            })

            const message = await Message.findByPk(messageId, {
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
                                            sequelize.literal(`
                                                (
                                                    SELECT messages.id
                                                    FROM messages
                                                    INNER JOIN message_statuses ON message_statuses.message_id = messages.id
                                                        WHERE message_statuses.receiver_id = message_status.receiver_id AND
                                                            message_statuses.status = 'read' 
                                                        AND messages.conversation_id = ${conversation?.get('id')}
                                                        AND (
                                                            message_statuses.is_revoked = 0
                                                            OR (
                                                                message_statuses.receiver_id != ${sequelize.escape(currentUserId)}
                                                                AND message_statuses.revoke_type = 'for-me'
                                                            )
                                                            OR (
                                                                message_statuses.revoke_type = 'for-other'
                                                            )
                                                        )
                                                        AND NOT EXISTS (
                                                            SELECT 1
                                                            FROM message_statuses
                                                            WHERE message_statuses.message_id = messages.id
                                                            AND message_statuses.is_revoked = 1
                                                            AND message_statuses.receiver_id = ${sequelize.escape(currentUserId)}
                                                            AND message_statuses.revoke_type = 'for-me'
                                                        )
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
                                            AND message_statuses.receiver_id = ${sequelize.escape(currentUserId)}
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
                                                AND message_statuses.receiver_id = ${sequelize.escape(currentUserId)}
                                                AND message_statuses.is_revoked = 1
                                            ) THEN NULL
                                            ELSE parent.content
                                        END
                                    `),
                                    'content',
                                ],
                            ],
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

            io.to(conversationUuid).emit(SocketEvent.UPDATE_READ_MESSAGE, { message, user_read_id: currentUserId })
        } catch (error) {
            console.log(error)
        }
    }

    const REACT_MESSAGE = async ({
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

            io.to(conversation_uuid).emit(SocketEvent.REACT_MESSAGE, { reaction, top_reactions, total_reactions })
        } catch (error) {
            console.log(error)
        }
    }

    const REMOVE_REACTION = async ({
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

        io.to(conversation_uuid).emit(SocketEvent.REMOVE_REACTION, {
            message_id,
            react,
            top_reactions,
            total_reactions,
        })
    }

    const DISCONNECT = async () => {
        // Delete all rooms that user has joined from Redis
        redisClient.keys(`user_${currentUserId}_in_room_*`).then((keys) => {
            keys.forEach((key) => redisClient.del(key))
        })
    }

    socket.on(SocketEvent.JOIN_ROOM, JOIN_ROOM)
    socket.on(SocketEvent.NEW_MESSAGE, NEW_MESSAGE)
    socket.on(SocketEvent.READ_MESSAGE, READ_MESSAGE)
    socket.on(SocketEvent.REACT_MESSAGE, REACT_MESSAGE)
    socket.on(SocketEvent.REMOVE_REACTION, REMOVE_REACTION)

    // Handle when user disconnect
    socket.on('disconnect', DISCONNECT)
}

export default listen
