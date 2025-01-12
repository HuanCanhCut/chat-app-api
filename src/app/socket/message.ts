import { ServerToClientEvents } from '../../config/socket/types'

import { Server, Socket } from 'socket.io'
import { ClientToServerEvents } from '../../config/socket/types'
import ChatSocketController from '~/app/controllers/ChatSocketController'
import { ChatEvent } from '~/enum/chat'

const listen = ({
    socket,
    io,
    decoded,
}: {
    socket: Socket
    io: Server<ClientToServerEvents, ServerToClientEvents>
    decoded: any
}) => {
    const chatSocketController = new ChatSocketController({
        currentUserId: Number(decoded?.sub),
        socket,
        io,
    })

    socket.on(ChatEvent.JOIN_ROOM, chatSocketController.JOIN_ROOM.bind(chatSocketController))
    socket.on(ChatEvent.NEW_MESSAGE, chatSocketController.NEW_MESSAGE.bind(chatSocketController))
    socket.on(ChatEvent.READ_MESSAGE, chatSocketController.READ_MESSAGE.bind(chatSocketController))

    // Handle when user disconnect
    socket.on('disconnect', () => {
        chatSocketController.DISCONNECT()
    })
}

export default listen
