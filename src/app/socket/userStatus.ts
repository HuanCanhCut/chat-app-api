import { Socket } from 'socket.io'
import SocketUserStatusService from '../services/SocketUserStatusService'

class userStatusListener {
    constructor(socket: Socket) {
        const socketUserStatusService = new SocketUserStatusService(socket)

        socketUserStatusService.CONNECT()

        socket.on('disconnect', socketUserStatusService.DISCONNECT)
    }
}

export default userStatusListener
