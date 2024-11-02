import { Server, Socket } from 'socket.io'
import { ClientToServerEvents, ServerToClientEvents } from './types'

let socket: Socket<ClientToServerEvents, ServerToClientEvents>

const socketIO = (io: Server<ClientToServerEvents, ServerToClientEvents>) => {
    io.on('connection', (socketInstance: Socket) => {
        console.log('\x1b[33m===>>>Socket connected!!!. Socket ID: ', socketInstance.id, '\x1b[0m')

        socket = socketInstance

        socketInstance.on('disconnect', () => {
            console.log('\x1b[33m===>>>Socket disconnected!!!', '\x1b[0m')
        })
    })
}

export { socket }

export default socketIO
