import { Server, Socket } from 'socket.io'

import onConnection from '~/app/socket'

const socketIO = (ioInstance: Server) => {
    ioInstance.on('connection', (socketInstance: Socket) => {
        onConnection(socketInstance, ioInstance)

        socketInstance.on('disconnect', async () => {
            console.log('\x1b[33m===>>>Socket disconnected!!!', '\x1b[0m')
        })
    })
}

export default socketIO
