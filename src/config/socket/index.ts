import { Server, Socket } from 'socket.io'

import onConnection from '~/app/socket'
import { ClientToServerEvents, InterServerEvents, ServerToClientEvents } from '~/app/socket/types'

let ioInstance: Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents>

const socketIO = (io: Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents>) => {
    ioInstance = io

    ioInstance.on('connection', (socketInstance: Socket) => {
        onConnection(socketInstance, ioInstance)

        socketInstance.on('disconnect', async () => {
            console.log('\x1b[33m===>>>Socket disconnected!!!', '\x1b[0m')
        })
    })
}

export { ioInstance }

export default socketIO
