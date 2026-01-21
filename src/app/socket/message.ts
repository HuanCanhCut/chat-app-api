import { Socket } from 'socket.io'

import SocketMessageService from '../services/SocketMessageService'
import { ClientToServerEvents, InterServerEvents, ServerToClientEvents } from './type'

class messageListener {
    private socket

    constructor(socket: Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents>) {
        this.socket = socket

        const socketMessageService = new SocketMessageService(socket)

        this.socket.on('NEW_MESSAGE', socketMessageService.NEW_MESSAGE)
        this.socket.on('READ_MESSAGE', socketMessageService.READ_MESSAGE)
        this.socket.on('REACT_MESSAGE', socketMessageService.REACT_MESSAGE)
        this.socket.on('REMOVE_REACTION', socketMessageService.REMOVE_REACTION)
        this.socket.on('MESSAGE_TYPING', socketMessageService.MESSAGE_TYPING)
    }
}

export default messageListener
