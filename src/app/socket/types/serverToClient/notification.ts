import { Notification } from '~/app/models'

export interface NotificationServerToClientEvents {
    NEW_NOTIFICATION: ({ notification }: { notification: Notification }) => void

    REMOVE_NOTIFICATION: ({ notification_id }: { notification_id?: number }) => void
}
