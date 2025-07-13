import { Socket } from 'socket.io'

import SocketUserStatusService from '../services/SocketUserStatusService'
import { SocketEvent } from '~/enum/socketEvent'

class userStatusListener {
    constructor(socket: Socket) {
        const socketUserStatusService = new SocketUserStatusService(socket)

        socketUserStatusService.CONNECT()

        socket.on(SocketEvent.VISIBILITY_CHANGE, socketUserStatusService.VISIBILITY_CHANGE)

        socket.on('disconnect', socketUserStatusService.DISCONNECT)
    }
}

export default userStatusListener
