import { ChatEvent } from '~/enum/chat'
import { NotificationEvent } from '~/enum/notification'

interface ServerToClientEvents {
    [NotificationEvent.NEW_NOTIFICATION]: (data: any) => void
    [NotificationEvent.REMOVE_NOTIFICATION]: (data: any) => void
    [ChatEvent.JOIN_ROOM]: (data: any) => void
    [ChatEvent.NEW_MESSAGE]: (data: any) => void
    [ChatEvent.UPDATE_READ_MESSAGE]: (data: any) => void
}

interface ClientToServerEvents {
    [NotificationEvent.NEW_NOTIFICATION]: (data: any) => void
    [NotificationEvent.REMOVE_NOTIFICATION]: (data: any) => void
    [ChatEvent.JOIN_ROOM]: (data: any) => void
    [ChatEvent.NEW_MESSAGE]: (data: any) => void
    [ChatEvent.UPDATE_READ_MESSAGE]: (data: any) => void
}

interface InterServerEvents {
    ping: () => void
}

export { ServerToClientEvents, ClientToServerEvents, InterServerEvents }
