import { Socket } from 'socket.io'

import SocketCallService from '../services/SocketCallService'
import { SocketEvent } from '~/enum/socketEvent'

class callListener {
    private socket: Socket

    constructor(socket: Socket) {
        this.socket = socket

        const socketCallService = new SocketCallService(socket, socket.data.decoded.sub)

        this.socket.on(SocketEvent.INITIATE_CALL, socketCallService.INITIATE_CALL)
        this.socket.on(SocketEvent.ACCEPTED_CALL, socketCallService.ACCEPTED_CALL)
    }
}

export default callListener
