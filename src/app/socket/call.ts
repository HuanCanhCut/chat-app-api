import { Socket } from 'socket.io'

import SocketCallService from '../services/socket/SocketCallService'
import { ClientToServerEvents, InterServerEvents, ServerToClientEvents } from './types/type'

class callListener {
    private socket

    constructor(socket: Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents>) {
        this.socket = socket

        const socketCallService = new SocketCallService(socket, socket.data.decoded.sub)

        this.socket.on('INITIATE_CALL', socketCallService.INITIATE_CALL)
        this.socket.on('ACCEPTED_CALL', socketCallService.ACCEPTED_CALL)
        this.socket.on('END_CALL', socketCallService.END_CALL)
        this.socket.on('RENEGOTIATION_OFFER', socketCallService.RENEGOTIATION_OFFER)
        this.socket.on('RENEGOTIATION_ANSWER', socketCallService.RENEGOTIATION_ANSWER)
        this.socket.on('REJECT_CALL', socketCallService.REJECT_CALL)
    }
}

export default callListener
