import { Socket } from 'socket.io'

import SocketMessageService from '../services/SocketMessageService'
import { SocketEvent } from '~/enum/socketEvent'

class messageListener {
    private socket: Socket

    constructor(socket: Socket) {
        this.socket = socket

        const socketMessageService = new SocketMessageService(socket)

        this.socket.on(SocketEvent.NEW_MESSAGE, socketMessageService.NEW_MESSAGE)
        this.socket.on(SocketEvent.READ_MESSAGE, socketMessageService.READ_MESSAGE)
        this.socket.on(SocketEvent.REACT_MESSAGE, socketMessageService.REACT_MESSAGE)
        this.socket.on(SocketEvent.REMOVE_REACTION, socketMessageService.REMOVE_REACTION)
        this.socket.on(SocketEvent.MESSAGE_TYPING, socketMessageService.MESSAGE_TYPING)
    }
}

export default messageListener
