export interface MessageClientToServerEvents {
    NEW_MESSAGE: ({
        conversation_uuid,
        message,
        type,
        parent_id,
    }: {
        conversation_uuid: string
        message: string
        type: string
        parent_id?: number | null
    }) => void

    READ_MESSAGE: ({ conversation_uuid, message_id }: { conversation_uuid: string; message_id: number }) => void

    REACT_MESSAGE: ({
        conversation_uuid,
        message_id,
        react,
        user_react_id,
    }: {
        conversation_uuid: string
        message_id: number
        react: string
        user_react_id: number
    }) => void

    REMOVE_REACTION: ({
        conversation_uuid,
        message_id,
        user_reaction_id,
        react,
    }: {
        conversation_uuid: string
        message_id: number
        user_reaction_id: number
        react: string
    }) => void

    MESSAGE_TYPING: ({
        conversation_uuid,
        user_id,
        is_typing,
    }: {
        conversation_uuid: string
        user_id: number
        is_typing: boolean
    }) => void
}
