import { Server, Socket } from 'socket.io'

import onConnection from '~/app/socket'

let ioInstance: Server

const socketIO = (io: Server) => {
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
