import { Server, Socket } from 'socket.io'
import jwt from 'jsonwebtoken'

import { redisClient } from '~/config/redis'
import { RedisKey } from '~/enum/redis'
import userStatus from '~/app/socket/userStatus'
import message from '~/app/socket/message'
import socketManager from './socketManager'

interface Decoded {
    sub: string
    exp: number
    jti: string
}

const onConnection = (socketInstance: Socket, ioInstance: Server) => {
    console.log('\x1b[33m===>>>Socket connected', socketInstance.id, '\x1b[0m')

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

                // Set io to global
                socketManager.setIO(ioInstance)

                socketManager.setDecoded(socketInstance.id, decoded as Decoded)

                // Listen event
                message(socketInstance)
                userStatus(socketInstance)
            }
        } catch (error) {
            console.log(error)
        }
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
