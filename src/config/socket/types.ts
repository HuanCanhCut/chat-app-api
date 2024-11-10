import { NotificationEvent } from '~/enum/notification'

interface ServerToClientEvents {
    [NotificationEvent.NEW_NOTIFICATION]: (data: any) => void
    [NotificationEvent.REMOVE_NOTIFICATION]: (data: any) => void
}

interface ClientToServerEvents {
    [NotificationEvent.NEW_NOTIFICATION]: (data: any) => void
    [NotificationEvent.REMOVE_NOTIFICATION]: (data: any) => void
}

interface InterServerEvents {
    ping: () => void
}

export { ServerToClientEvents, ClientToServerEvents, InterServerEvents }
