import { Server, Socket } from 'socket.io'
import jwt from 'jsonwebtoken'

import { redisClient } from '~/config/redis'
import { RedisKey } from '~/enum/redis'
import userStatus from '~/app/socket/userStatus'
import message from '~/app/socket/message'
import socketManager from './socketManager'

const onConnection = (socketInstance: Socket, ioInstance: Server) => {
    const cookies = socketInstance.handshake.headers.cookie

    const token = cookies
        ?.split('; ')
        .find((row: string) => row.startsWith('refresh_token='))
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
    socketManager.setSocket(socketInstance)
    socketManager.setIO(ioInstance)

    if (decoded) {
        socketManager.setDecoded(decoded)

        // Listen event
        message()
        userStatus()
    }

    socketInstance.on('disconnect', async () => {
        if (decoded) {
            // get all socket ids of user from Redis
            const socketIds = await redisClient.lRange(`${RedisKey.SOCKET_ID}${decoded.sub}`, 0, -1)

            if (socketIds && socketIds.length > 0) {
                for (const socketId of socketIds) {
                    // check if socket is connected
                    const isConnected = ioInstance.sockets.sockets.has(socketId)

                    if (!isConnected) {
                        // if socket is not connected, remove it from Redis
                        await redisClient.lRem(`${RedisKey.SOCKET_ID}${decoded.sub}`, 0, socketId)
                    }
                }
            }
        }
    })
}

export default onConnection
