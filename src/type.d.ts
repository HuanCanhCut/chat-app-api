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

export interface IRequest extends Request {
    decoded?: string | JwtPayload
}

export interface MulterRequest extends Request, IRequest {
    files?: {
        avatar?: Express.Multer.File[]
        cover_photo?: Express.Multer.File[]
    }
}

import { SocketEvent } from '~/enum/socketEvent'

interface ServerToClientEvents {
    [SocketEvent.NEW_NOTIFICATION]: (data: any) => void
    [SocketEvent.REMOVE_NOTIFICATION]: (data: any) => void
    [SocketEvent.JOIN_ROOM]: (data: any) => void
    [SocketEvent.NEW_MESSAGE]: (data: any) => void
    [SocketEvent.UPDATE_READ_MESSAGE]: (data: any) => void
}

interface ClientToServerEvents {
    [SocketEvent.NEW_NOTIFICATION]: (data: any) => void
    [SocketEvent.REMOVE_NOTIFICATION]: (data: any) => void
    [SocketEvent.JOIN_ROOM]: (data: any) => void
    [SocketEvent.NEW_MESSAGE]: (data: any) => void
    [SocketEvent.UPDATE_READ_MESSAGE]: (data: any) => void
}

interface InterServerEvents {
    ping: () => void
}

export { ServerToClientEvents, ClientToServerEvents, InterServerEvents }
