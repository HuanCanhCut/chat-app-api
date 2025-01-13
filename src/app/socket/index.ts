import { Server, Socket } from 'socket.io'
import jwt from 'jsonwebtoken'
import dotenv from 'dotenv'

import { ClientToServerEvents, ServerToClientEvents } from '~/type'
import { redisClient } from '~/config/redis'
import { RedisKey } from '~/enum/redis'
import userStatus from '~/app/socket/userStatus'
import message from '~/app/socket/message'

dotenv.config()

let socket: Socket<ClientToServerEvents, ServerToClientEvents>
let io: Server<ClientToServerEvents, ServerToClientEvents>

const onConnection = (socketInstance: Socket, ioInstance: Server<ClientToServerEvents, ServerToClientEvents>) => {
    const cookies = socketInstance.handshake.headers.cookie

    const token = cookies
        ?.split('; ')
        .find((row: string) => row.startsWith('refreshToken='))
        ?.split('=')[1]

    let decoded: string | jwt.JwtPayload | undefined

    if (token) {
        try {
            decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET as string)
            if (decoded) {
                redisClient.rPush(`${RedisKey.SOCKET_ID}${decoded.sub}`, socketInstance.id)
            }
        } catch (error) {
            console.log(error)
        }
    }

    // Set socket to global
    socket = socketInstance
    io = ioInstance

    // Listen event
    if (decoded) {
        message({ socket: socketInstance, io: ioInstance, decoded })
        userStatus({ currentUserId: Number(decoded.sub), socket: socketInstance })
    }

    socketInstance.on('disconnect', async () => {
        if (decoded) {
            // get all socket ids of user from Redis
            const socketIds = await redisClient.lRange(`${RedisKey.SOCKET_ID}${decoded.sub}`, 0, -1)

            if (socketIds && socketIds.length > 0) {
                for (const socketId of socketIds) {
                    // check if socket is connected
                    const isConnected = io.sockets.sockets.has(socketId)

                    if (!isConnected) {
                        // if socket is not connected, remove it from Redis
                        await redisClient.lRem(`${RedisKey.SOCKET_ID}${decoded.sub}`, 0, socketId)
                    }
                }
            }
        }
    })
}

export { socket, io }

export default onConnection
