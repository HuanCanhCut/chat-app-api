import { Request } from 'express'

export interface UserModel {
    id?: number
    first_name: string
    last_name: string
    full_name: string
    nickname: string
    uuid: string
    email: string
    avatar: string
    sent_friend_request?: boolean
    is_friend?: boolean
    created_at?: Date
    updated_at?: Date
    cover_photo?: string
    password?: string
}

export interface ConversationModel {
    id?: number
    uuid: string
    name?: string
    avatar?: string
    is_group: boolean
}

export interface MessageStatus extends Timestamp {
    id: number
    message_id: number
    receiver_id: number
    status: 'sent' | 'delivered' | 'read' | 'sending'
    receiver: UserModel & { last_read_message_id: number }
    is_revoked: boolean
    revoke_type: 'for-other' | 'for-me'
    read_at: Date
}

export interface MessageModel {
    id: number
    conversation_id: number
    content: string | null
    sender_id: number
    sender: UserModel
    message_status: MessageStatus[]
    is_read: 0 | 1
    type:
        | 'text'
        | 'image'
        | 'icon'
        | 'system_change_group_name'
        | 'system_set_nickname'
        | 'system_change_theme'
        | 'system_add_user'
        | 'system_remove_user'
    top_reactions?: TopReaction[]
    total_reactions: number
    parent_id: number | null
    parent: MessageModel | null
    [key: string]: any
}

export interface IRequest extends Request {
    decoded?: string | JwtPayload
}

export interface MulterRequest extends Request, IRequest {
    files?: {
        avatar?: Express.Multer.File[]
        cover_photo?: Express.Multer.File[]
    }
}

export type MessageType =
    | 'text'
    | 'image'
    | 'icon'
    | 'system_change_group_name'
    | 'system_set_nickname'
    | 'system_change_theme'
    | 'system_add_user'
    | 'system_remove_user'
