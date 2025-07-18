import { Socket } from 'socket.io'

import SocketConversationService from '../services/SocketConversationService'
import { SocketEvent } from '~/enum/socketEvent'

class conversationListener {
    private socket: Socket

    constructor(socket: Socket) {
        this.socket = socket

        const socketConversationService = new SocketConversationService(socket)

        this.socket.on(SocketEvent.JOIN_ROOM, socketConversationService.JOIN_ROOM)

        // Handle when user disconnect
        this.socket.on('disconnect', socketConversationService.DISCONNECT)
    }
}

export default conversationListener
