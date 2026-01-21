export interface UserServerToClientEvents {
    USER_STATUS: ({
        user_id,
        is_online,
        last_online_at,
    }: {
        user_id: number
        is_online: boolean
        last_online_at: string | null
    }) => void
}
