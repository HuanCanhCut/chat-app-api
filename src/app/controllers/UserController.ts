import { NextFunction, Response } from 'express'

import { UnprocessableEntityError } from '../errors/errors'
import UserService from '../services/UserService'
import { IRequest } from '~/type'

class UserController {
    // [GET] /user/:nickname
    async getAnUser(req: IRequest, res: Response, next: NextFunction) {
        try {
            const { nickname } = req.params

            const decoded = req.decoded

            if (!nickname) {
                return next(new UnprocessableEntityError({ message: 'Nickname is required' }))
            }

            if (!nickname.startsWith('@')) {
                return next(new UnprocessableEntityError({ message: 'Nickname must start with @' }))
            }

            const user = await UserService.getUserByNickname({ nickname, currentUserId: decoded.sub })

            res.json({ data: user })
        } catch (error: any) {
            return next(error)
        }
    }

    async searchUser(req: IRequest, res: Response, next: NextFunction) {
        try {
            const { q, type } = req.query

            const decoded = req.decoded || { sub: 0 }

            if (!q || !type) {
                return next(new UnprocessableEntityError({ message: 'Query and type are required' }))
            }

            if (type !== 'less' && type !== 'more') {
                return next(new UnprocessableEntityError({ message: 'Type must be less or more' }))
            }

            const users = await UserService.searchUser({ q: q as string, type, currentUserId: decoded.sub })

            res.json({ data: users })
        } catch (error: any) {
            return next(error)
        }
    }

    async setSearchHistory(req: IRequest, res: Response, next: NextFunction) {
        try {
            const decoded = req.decoded

            const { user_search_id } = req.body

            if (!user_search_id) {
                return next(new UnprocessableEntityError({ message: 'User search id is required' }))
            }

            await UserService.setSearchHistory({ currentUserId: decoded.sub, userSearchId: Number(user_search_id) })

            res.sendStatus(204)
        } catch (error: any) {
            return next(error)
        }
    }

    // [GET] /user/search-history
    async getSearchHistory(req: IRequest, res: Response, next: NextFunction) {
        try {
            const decoded = req.decoded

            const searchHistory = await UserService.getSearchHistory({ currentUserId: decoded.sub })

            res.json({ data: searchHistory })
        } catch (error: any) {
            return next(error)
        }
    }
}

export default new UserController()
