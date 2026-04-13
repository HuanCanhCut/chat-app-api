export interface ConversationClientToServerEvents {
    JOIN_ROOM: (conversation_uuid: string) => void
    LEAVE_ROOM: ({ conversation_uuid, user_id }: { conversation_uuid: string; user_id?: number }) => void
}
