import { Socket } from 'socket.io'

import ConversationService from './ConversationService'
import { redisClient } from '~/config/redis'
import { ioInstance } from '~/config/socket'
import { RedisKey } from '~/enum/redis'

class SocketConversationService {
    private socket: Socket
    private currentUserId?: number

    constructor(socket: Socket, currentUserId?: number) {
        this.socket = socket
        this.currentUserId = currentUserId || socket.data.decoded.sub
    }

    JOIN_ROOM = async (conversation_uuid: string) => {
        try {
            // Get all socket ids of user from Redis
            const socketIds = await redisClient.lRange(`${RedisKey.SOCKET_ID}${this.currentUserId}`, 0, -1)

            const hasMember = await ConversationService.getMemberInConversation({
                userId: this.currentUserId!,
                conversationUuid: conversation_uuid,
                currentUserId: this.currentUserId!,
            })

            if (!hasMember) {
                return
            }

            if (socketIds && socketIds.length > 0) {
                for (const socketId of socketIds) {
                    const userInRoom = ioInstance.sockets.adapter.rooms.get(conversation_uuid)?.has(socketId)

                    if (!userInRoom) {
                        const userSocket = ioInstance.sockets.sockets.get(socketId) // Get socket from socketId

                        if (userSocket) {
                            userSocket.join(conversation_uuid) // Socket join room
                        }
                    }
                }
            }
        } catch (error) {
            console.log(error)
        }
    }

    LEAVE_ROOM = async ({ conversation_uuid, user_id }: { conversation_uuid?: string; user_id?: number }) => {
        const socketIds = await redisClient.lRange(`${RedisKey.SOCKET_ID}${user_id}`, 0, -1)

        socketIds.forEach((socketId) => {
            const userSocket = ioInstance.sockets.sockets.get(socketId)

            if (userSocket) {
                const rooms = conversation_uuid ? [conversation_uuid] : [...userSocket.rooms]

                rooms.forEach((room) => {
                    if (room !== socketId) {
                        userSocket.leave(room)
                    }
                })
            }
        })
    }

    DISCONNECT = async () => {
        this.LEAVE_ROOM({ user_id: this.currentUserId! })
    }
}

export default SocketConversationService
