export interface UserClientToServerEvents {
    VISIBILITY_CHANGE: ({ is_visible }: { is_visible: boolean }) => void
}
