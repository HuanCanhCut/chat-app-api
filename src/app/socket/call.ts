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
        this.socket.on(SocketEvent.END_CALL, socketCallService.END_CALL)
        this.socket.on(SocketEvent.RENEGOTIATION_OFFER, socketCallService.RENEGOTIATION_OFFER)
        this.socket.on(SocketEvent.RENEGOTIATION_ANSWER, socketCallService.RENEGOTIATION_ANSWER)
        this.socket.on(SocketEvent.REJECT_CALL, socketCallService.REJECT_CALL)
    }
}

export default callListener
