import { User } from '~/app/models'

export interface NotificationServerToClientEvents {
    NEW_NOTIFICATION: ({
        notification,
    }: {
        notification: {
            sender_id: number
            sender_user: User
            id?: number
            type: 'friend_request' | 'accept_friend_request' | 'message'
            recipient_id: number
            message: string
            is_read?: boolean
            is_seen?: boolean
            created_at?: Date
            updated_at?: Date
        }
    }) => void

    REMOVE_NOTIFICATION: ({ notification_id }: { notification_id?: number }) => void
}
