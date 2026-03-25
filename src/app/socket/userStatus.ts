import { Socket } from 'socket.io'

import SocketUserStatusService from '../services/socket/SocketUserStatusService'
import { ClientToServerEvents, InterServerEvents, ServerToClientEvents } from './types/type'

class userStatusListener {
    constructor(socket: Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents>) {
        const socketUserStatusService = new SocketUserStatusService(socket)

        socketUserStatusService.CONNECT()

        socket.on('VISIBILITY_CHANGE', socketUserStatusService.VISIBILITY_CHANGE)

        socket.on('disconnect', socketUserStatusService.DISCONNECT)
    }
}

export default userStatusListener
