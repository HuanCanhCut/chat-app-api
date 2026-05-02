import { Conversation, Message, MessageReaction } from '~/app/models'

export interface MessageServerToClientEvents {
    // ------------------------------- MESSAGE -------------------------------
    NEW_MESSAGE: ({ conversation }: { conversation: Conversation }) => void
    UPDATE_READ_MESSAGE: ({
        message,
        user_read_id,
        conversation_uuid,
    }: {
        message: Message | null
        user_read_id: number
        conversation_uuid?: string
    }) => void

    REACT_MESSAGE: ({
        reaction,
        top_reactions,
        total_reactions,
    }: {
        reaction: MessageReaction | null
        top_reactions: MessageReaction[]
        total_reactions: number
    }) => void

    REMOVE_REACTION: ({
        message_id,
        react,
        top_reactions,
        total_reactions,
    }: {
        message_id: number
        react: string
        top_reactions: MessageReaction[]
        total_reactions: number
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

    MESSAGE_REVOKE: ({ message_id, conversation_uuid }: { message_id: number; conversation_uuid: string }) => void

    // ------------------------------- AI -------------------------------
    UPDATE_CHUNK_MESSAGE: ({
        message_id,
        chunk,
        conversation_uuid,
    }: {
        message_id: number
        chunk: string
        conversation_uuid: string
    }) => void
}
