import { Socket } from 'socket.io'
import { SocketEvent } from '~/enum/socketEvent'
import SocketMessageService from '../services/SocketMessageService'

class messageListener {
    private socket: Socket

    constructor(socket: Socket) {
        this.socket = socket

        const socketMessageService = new SocketMessageService(socket)

        this.socket.on(SocketEvent.JOIN_ROOM, socketMessageService.JOIN_ROOM)
        this.socket.on(SocketEvent.NEW_MESSAGE, socketMessageService.NEW_MESSAGE)
        this.socket.on(SocketEvent.READ_MESSAGE, socketMessageService.READ_MESSAGE)
        this.socket.on(SocketEvent.REACT_MESSAGE, socketMessageService.REACT_MESSAGE)
        this.socket.on(SocketEvent.REMOVE_REACTION, socketMessageService.REMOVE_REACTION)

        // Handle when user disconnect
        this.socket.on('disconnect', socketMessageService.DISCONNECT)
    }
}

export default messageListener
