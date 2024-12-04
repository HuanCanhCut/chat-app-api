import { Socket, Server } from 'socket.io'
import { ClientToServerEvents, ServerToClientEvents } from '~/config/socket/types'
import { ChatEvent } from '~/enum/chat'
import { Conversation, ConversationMember, Message, MessageStatus, User } from '../models'
import { Op } from 'sequelize'
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
        // Lấy danh sách tất cả socket id của user từ Redis
        const socketIds = await redisClient.lRange(`${RedisKey.SOCKET_ID}${currentUserId}`, 0, -1)

        if (socketIds && socketIds.length > 0) {
            for (const socketId of socketIds) {
                const userSocket = io.sockets.sockets.get(socketId) // Lấy socket từ socketId
                if (userSocket) {
                    userSocket.join(conversationUuid) // Socket join room
                }
            }
        }

        // Lưu trạng thái user đã vào room vào Redis
        await redisClient.set(`user_${currentUserId}_in_room_${conversationUuid}`, 'true')
    })

    socket.on(ChatEvent.NEW_MESSAGE, async ({ conversationUuid, message }) => {
        const allUserInRoom = await User.findAll({
            attributes: ['id', 'is_online'],
            where: { id: { [Op.ne]: currentUserId } },
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

        const userIds = allUserInRoom.map((user: any) => {
            return {
                id: user.get('id'),
                is_online: user.get('is_online'),
                conversation_id: user?.dataValues?.conversation_members[0]?.dataValues?.conversation_id,
            }
        })

        if (!userIds.length) return

        for (const user of userIds) {
            if (!user.id) return

            // if member online
            if (user.is_online) {
                const newMessage = await saveMessageToDatabase({
                    conversationId: user.conversation_id,
                    senderId: currentUserId,
                    userId: user.id,
                    message,
                    status: 'delivered',
                })

                if (!newMessage) return

                const isUserInRoom = await redisClient.get(`user_${user.id}_in_room_${conversationUuid}`)

                // but not in the room
                if (!isUserInRoom) {
                    const socketIds = await redisClient.lRange(`${RedisKey.SOCKET_ID}${user.id}`, 0, -1)

                    // nếu lưu thành công thì emit lại cho user
                    if (socketIds && socketIds.length > 0) {
                        const conversationCache = await redisClient.get(
                            `${RedisKey.CONVERSATION_UUID}${conversationUuid}`,
                        )

                        if (conversationCache) {
                            const conversation = {
                                ...JSON.parse(conversationCache),
                                messages: [newMessage],
                            }
                            for (const socketId of socketIds) {
                                io.to(socketId).emit(ChatEvent.NEW_MESSAGE, { conversation })
                            }
                        } else {
                            try {
                                // get conversation from database
                                const conversation = await getConversation({
                                    conversationUuid,
                                    user,
                                })

                                if (conversation) {
                                    redisClient.set(
                                        `${RedisKey.CONVERSATION_UUID}${conversationUuid}`,
                                        JSON.stringify(conversation),
                                    )

                                    const conversationData = {
                                        ...conversation.dataValues,
                                        messages: [newMessage],
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
                } else {
                    // user in the room
                    const conversationCache = await redisClient.get(`${RedisKey.CONVERSATION_UUID}${conversationUuid}`)

                    if (conversationCache) {
                        const conversation = {
                            ...JSON.parse(conversationCache),
                            messages: [newMessage],
                        }

                        io.to(conversationUuid).emit(ChatEvent.NEW_MESSAGE, { conversation })
                    } else {
                        // get conversation from database
                        const conversation = await getConversation({
                            conversationUuid,
                            user,
                        })

                        if (conversation) {
                            redisClient.set(
                                `${RedisKey.CONVERSATION_UUID}${conversationUuid}`,
                                JSON.stringify(conversation),
                            )

                            const conversationData = {
                                ...conversation.dataValues,
                                messages: [newMessage],
                            }

                            io.to(conversationUuid).emit(ChatEvent.NEW_MESSAGE, { conversation: conversationData })
                        }
                    }
                }
            } else {
                // user offline
                // save message to database
                await saveMessageToDatabase({
                    conversationId: user.conversation_id,
                    senderId: currentUserId,
                    userId: user.id,
                    message,
                    status: 'sent',
                })
            }
        }
    })

    // Xử lý khi người dùng ngắt kết nối
    socket.on('disconnect', () => {
        // Xóa tất cả room mà user đã join khỏi Redis
        redisClient.keys(`user_${currentUserId}_in_room_*`).then((keys) => {
            keys.forEach((key) => redisClient.del(key))
        })
    })
}

const saveMessageToDatabase = async ({
    conversationId,
    senderId,
    userId,
    message,
    status,
}: {
    conversationId: number
    senderId: number
    userId: number
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
            await MessageStatus.create({
                message_id: newMessage.id,
                user_id: userId,
                status,
            })
        }

        await transaction.commit()

        // last message
        const messageResponse = await Message.findByPk(newMessage.id, {
            include: [
                {
                    model: User,
                    as: 'sender',
                    required: true,
                    attributes: {
                        exclude: ['password', 'email'],
                    },
                },
                {
                    model: MessageStatus,
                    as: 'message_status',
                },
            ],
        })

        return messageResponse
    } catch (error) {
        if (transaction) {
            await transaction.rollback()
        }
        console.log(error)
    }
}

const getConversation = async ({ conversationUuid, user }: { conversationUuid: string; user: any }) => {
    try {
        // get conversation from database
        const conversation = await Conversation.findOne({
            where: {
                uuid: conversationUuid,
            },
            include: [
                {
                    where: {
                        user_id: {
                            [Op.ne]: user.id,
                        },
                    },
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
