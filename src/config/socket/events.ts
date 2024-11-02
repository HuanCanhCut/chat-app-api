import { InterServerEvents } from './types'
import { ServerToClientEvents } from './types'
import { ClientToServerEvents } from './types'
import { Socket } from 'socket.io'

type SocketType = Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents>

export const notificationEvent = (socket: SocketType) => {
    socket.on('notification', (data) => {
        console.log(data)
    })
}
