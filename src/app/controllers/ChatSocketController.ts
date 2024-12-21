import { Socket, Server } from 'socket.io'
import { ClientToServerEvents, ServerToClientEvents } from '~/config/socket/types'
import { ChatEvent } from '~/enum/chat'
import { Conversation, ConversationMember, Message, MessageStatus, User } from '../models'
import { Op, QueryTypes } from 'sequelize'
import { redisClient } from '~/config/redis'
import { RedisKey } from '~/enum/redis'
import { sequelize } from '~/config/db'

const chatController = ({
    socket,
    io,
    currentUserId,
}: {
    socket: Socket
    io: Server<ClientToServerEvents, ServerToClientEvents>
    currentUserId: number
}) => {
    socket.on(ChatEvent.JOIN_ROOM, async (conversationUuid: string) => {
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
    })

    socket.on(ChatEvent.READ_MESSAGE, async ({ conversationUuid, messageId }) => {
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
                message_statuses.status = 'read'
            WHERE 
                conversations.uuid = :conversationUuid
            AND 
                message_statuses.receiver_id = :receiverId
            `,
                {
                    replacements: {
                        conversationUuid,
                        receiverId: currentUserId,
                    },
                    type: QueryTypes.UPDATE,
                },
            )

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
                                    include: [[sequelize.literal(`${messageId}`), 'last_read_message_id']],
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
                ],
            })

            socket.to(conversationUuid).emit(ChatEvent.UPDATE_READ_MESSAGE, { message })
        } catch (error) {
            console.log(error)
        }
    })

    socket.on(ChatEvent.NEW_MESSAGE, async ({ conversationUuid, message }) => {
        // get all users online in a conversation
        const allUserOfConversation = await User.findAll({
            attributes: ['id', 'is_online'],
            where: {
                id: {
                    [Op.ne]: currentUserId,
                },
            },
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

        const userIds = allUserOfConversation.map((user: any) => {
            return {
                id: user.get('id'),
                is_online: user.get('is_online'),
            }
        })

        const newMessage = await saveMessageToDatabase({
            conversationId: conversation.dataValues.id,
            senderId: currentUserId,
            userIds: userIds.map((user) => user.id),
            message,
            status: 'delivered',
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

            io.to(conversationUuid).emit(ChatEvent.NEW_MESSAGE, { conversation })
        } else {
            // get conversation from database
            const conversation = await getConversation({
                conversationUuid,
            })

            if (conversation) {
                redisClient.set(`${RedisKey.CONVERSATION_UUID}${conversationUuid}`, JSON.stringify(conversation))

                const conversationData = {
                    ...conversation.dataValues,
                    last_message: newMessage,
                }

                io.to(conversationUuid).emit(ChatEvent.NEW_MESSAGE, { conversation: conversationData })
            }
        }

        for (const user of userIds) {
            const isUserInRoom = await redisClient.get(`user_${user.id}_in_room_${conversationUuid}`)

            // user online but not in the room
            if (!isUserInRoom && user.is_online) {
                const socketIds = await redisClient.lRange(`${RedisKey.SOCKET_ID}${user.id}`, 0, -1)

                // if save message to database success
                if (socketIds && socketIds.length > 0) {
                    const conversationCache = await redisClient.get(`${RedisKey.CONVERSATION_UUID}${conversationUuid}`)

                    if (conversationCache) {
                        const conversation = {
                            ...JSON.parse(conversationCache),
                            last_message: newMessage,
                        }
                        for (const socketId of socketIds) {
                            io.to(socketId).emit(ChatEvent.NEW_MESSAGE, { conversation })
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
                                )

                                const conversationData = {
                                    ...conversation.dataValues,
                                    last_message: newMessage,
                                }

                                for (const socketId of socketIds) {
                                    io.to(socketId).emit(ChatEvent.NEW_MESSAGE, {
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
    })

    // Handle when user disconnect
    socket.on('disconnect', () => {
        // Delete all rooms that user has joined from Redis
        redisClient.keys(`user_${currentUserId}_in_room_*`).then((keys) => {
            keys.forEach((key) => redisClient.del(key))
        })
    })
}

const saveMessageToDatabase = async ({
    conversationId,
    senderId,
    userIds,
    message,
    status,
}: {
    conversationId: number
    senderId: number
    userIds: number[]
    message: string
    status: 'sent' | 'delivered' | 'read'
}) => {
    const transaction = await sequelize.transaction()
    try {
        // save message to database
        const newMessage = await Message.create({
            conversation_id: conversationId,
            sender_id: senderId,
            content: message,
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

export default chatController
