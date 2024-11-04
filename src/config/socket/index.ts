import { Server, Socket } from 'socket.io'
import jwt from 'jsonwebtoken'
import dotenv from 'dotenv'

import { ClientToServerEvents, ServerToClientEvents } from './types'
import { client as redisClient } from '~/config/redis'

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
                    redisClient.set(`socket_id_${decoded.sub}`, socketInstance.id)
                }
            } catch (error) {
                console.log(error)
            }
        }

        // Set socket to global
        socket = socketInstance
        io = ioInstance

        socketInstance.on('disconnect', () => {
            console.log('\x1b[33m===>>>Socket disconnected!!!', '\x1b[0m')
            if (decoded) {
                redisClient.del(`socket_id_${decoded.sub}`)
            }
        })
    })
}

export { socket, io }

export default socketIO
