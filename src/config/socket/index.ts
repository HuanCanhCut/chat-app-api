import { Server, Socket } from 'socket.io'
import dotenv from 'dotenv'

import { ClientToServerEvents, ServerToClientEvents } from '~/type'
import onConnection from '~/app/socket'

dotenv.config()

const socketIO = (ioInstance: Server<ClientToServerEvents, ServerToClientEvents>) => {
    ioInstance.on('connection', (socketInstance: Socket) => {
        onConnection(socketInstance, ioInstance)

        socketInstance.on('disconnect', async () => {
            console.log('\x1b[33m===>>>Socket disconnected!!!', '\x1b[0m')
        })
    })
}

export default socketIO
