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
    socket.on(ChatEvent.JOIN_ROOM, (roomUuid: string) => {
        socket.join(roomUuid)
        redisClient.set(`user_${currentUserId}_in_room_${roomUuid}`, 'true')
    })

    socket.on(ChatEvent.NEW_MESSAGE, async ({ roomUuid, message }) => {
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
                            where: { uuid: roomUuid },
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

        userIds.forEach(async (user) => {
            if (!user.id) return
            // if member online
            if (user.is_online) {
                const isUserInRoom = await redisClient.get(`user_${user.id}_in_room_${roomUuid}`)

                // but not in the room
                const transaction = await sequelize.transaction()
                if (!isUserInRoom) {
                    try {
                        const socketId = await redisClient.get(`${RedisKey.SOCKET_ID}${user.id}`)

                        // save message to database
                        const newMessage = await Message.create({
                            conversation_id: user.conversation_id,
                            sender_id: currentUserId,
                            content: message,
                        })

                        if (newMessage.id) {
                            await MessageStatus.create({
                                message_id: newMessage.id,
                                user_id: user.id,
                                status: 'sent',
                            })
                        }

                        await transaction.commit()

                        // nếu lưu thành công thì emit lại cho user
                        if (socketId) {
                            io.to(socketId).emit(ChatEvent.NEW_MESSAGE, { roomUuid, message })
                        }
                        // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    } catch (e: any) {
                        await transaction.rollback()
                    }
                } else {
                    // user in the room
                    socket.to(roomUuid).emit(ChatEvent.NEW_MESSAGE, { roomUuid, message })
                }
            }
        })
    })

    // Xử lý khi người dùng ngắt kết nối
    socket.on('disconnect', () => {
        // Xóa tất cả room mà user đã join khỏi Redis
        redisClient.keys(`user_${currentUserId}_in_room_*`).then((keys) => {
            keys.forEach((key) => redisClient.del(key))
        })
    })
}

export default chatController
