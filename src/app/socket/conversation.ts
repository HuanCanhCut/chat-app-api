import { Socket } from 'socket.io'

import SocketConversationService from '../services/socket/SocketConversationService'
import { ClientToServerEvents, InterServerEvents, ServerToClientEvents } from './types/type'

class conversationListener {
    private socket

    constructor(socket: Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents>) {
        this.socket = socket

        const socketConversationService = new SocketConversationService(socket)

        this.socket.on('JOIN_ROOM', socketConversationService.JOIN_ROOM)
        this.socket.on('LEAVE_ROOM', socketConversationService.LEAVE_ROOM)

        // Handle when user disconnect
        this.socket.on('disconnect', socketConversationService.DISCONNECT)
    }
}

export default conversationListener
