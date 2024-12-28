import { Server, Socket } from 'socket.io'
import jwt from 'jsonwebtoken'
import dotenv from 'dotenv'

import { ClientToServerEvents, ServerToClientEvents } from './types'
import { redisClient } from '../../config/redis'
import { RedisKey } from '~/enum/redis'
import { User } from '~/app/models'
import listen from './listen'

dotenv.config()

let socket: Socket<ClientToServerEvents, ServerToClientEvents>
let io: Server<ClientToServerEvents, ServerToClientEvents>

const socketIO = (ioInstance: Server<ClientToServerEvents, ServerToClientEvents>) => {
    ioInstance.on('connection', (socketInstance: Socket) => {
        console.log('\x1b[33m===>>>Socket connected!!! socket id:', socketInstance.id, '\x1b[0m')

        const cookies = socketInstance.handshake.headers.cookie

        const token = cookies
            ?.split('; ')
            .find((row) => row.startsWith('refreshToken='))
            ?.split('=')[1]

        let decoded: string | jwt.JwtPayload | undefined

        if (token) {
            try {
                decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET as string)
                if (decoded) {
                    // lưu theo dạng list trường hợp nhiều user login 1 account
                    redisClient.rPush(`${RedisKey.SOCKET_ID}${decoded.sub}`, socketInstance.id)

                    // set user online when connect to database
                    User.update({ is_online: true }, { where: { id: Number(decoded.sub) } })
                }
            } catch (error) {
                console.log(error)
            }
        }

        // chatSocketController({ socket: socketInstance, io: ioInstance, currentUserId: Number(decoded?.sub) })
        listen({ socket: socketInstance, io: ioInstance, decoded })

        // Set socket to global
        socket = socketInstance
        io = ioInstance

        socketInstance.on('disconnect', async () => {
            console.log('\x1b[33m===>>>Socket disconnected!!!', '\x1b[0m')
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

                User.update({ is_online: false }, { where: { id: Number(decoded.sub) } })
            }
        })
    })
}

export { socket, io }

export default socketIO
