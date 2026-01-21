import { Block, Conversation, ConversationMember, ConversationTheme } from '~/app/models'

export interface ConversationServerToClientEvents {
    CONVERSATION_RENAMED: ({
        conversation_uuid,
        key,
        value,
    }: {
        conversation_uuid: string
        key: string
        value: string
    }) => void

    CONVERSATION_AVATAR_CHANGED: ({
        conversation_uuid,
        key,
        value,
    }: {
        conversation_uuid: string
        key: string
        value: string
    }) => void

    CONVERSATION_THEME_CHANGED: ({
        conversation_uuid,
        key,
        value,
    }: {
        conversation_uuid: string
        key: string
        value: ConversationTheme
    }) => void

    CONVERSATION_EMOJI_CHANGED: ({
        conversation_uuid,
        key,
        value,
    }: {
        conversation_uuid: string
        key: string
        value?: string
    }) => void

    CONVERSATION_MEMBER_NICKNAME_CHANGED: ({
        conversation_uuid,
        user_id,
        key,
        value,
    }: {
        conversation_uuid: string
        user_id: number
        key: string
        value: string
    }) => void

    CONVERSATION_MEMBER_ADDED: ({
        conversation_uuid,
        members,
    }: {
        conversation_uuid: string
        members: (ConversationMember | null)[]
    }) => void

    CONVERSATION_MEMBER_JOINED: () => void

    CONVERSATION_LEADER_CHANGED: ({
        conversation_uuid,
        user_id,
        key,
        value,
    }: {
        conversation_uuid: string
        user_id: number
        key: string
        value: string
    }) => void

    CONVERSATION_MEMBER_REMOVED: ({
        conversation_uuid,
        member_id,
    }: {
        conversation_uuid: string
        member_id: number
    }) => void

    CONVERSATION_MEMBER_LEAVED: ({
        conversation_uuid,
        member_id,
    }: {
        conversation_uuid: string
        member_id?: number
    }) => void

    CONVERSATION_BLOCKED: ({
        conversation_uuid,
        key,
        value,
    }: {
        conversation_uuid: string
        key: string
        value: Block | null
    }) => void

    CONVERSATION_UNBLOCKED: ({
        conversation_uuid,
        key,
        value,
    }: {
        conversation_uuid: string
        key: string
        value: Block | null
    }) => void

    NEW_CONVERSATION: (conversation: Conversation) => void
}
