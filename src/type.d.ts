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
    cover_photo: string
    password?: string
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
