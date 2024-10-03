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
    createdAt?: Date
    updatedAt?: Date
}

export interface IRequest extends Request {
    decoded?: string | JwtPayload
}
