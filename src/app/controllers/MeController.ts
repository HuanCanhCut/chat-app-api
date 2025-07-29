import { NextFunction, Response } from 'express'

import { NotFoundError, UnprocessableEntityError } from '../errors/errors'
import UserService from '../services/UserService'
import clearCookie from '../utils/clearCookies'
import { IRequest, MulterRequest } from '~/type'

class MeController {
    // [GET] /auth/me
    async getCurrentUser(req: IRequest, res: Response, next: NextFunction) {
        try {
            const decoded = req.decoded

            const user = await UserService.getUserById(decoded.sub)

            res.json({ data: user })
        } catch (error: any) {
            if (error instanceof NotFoundError) {
                clearCookie({ res, cookies: ['access_token', 'refresh_token'] })
            }

            return next(error)
        }
    }

    // [PATCH] /auth/me
    async updateCurrentUser(req: IRequest, res: Response, next: NextFunction) {
        const typedReq = req as MulterRequest
        try {
            const { files } = typedReq

            const { first_name, last_name, nickname } = req.body

            if (!first_name && !last_name) {
                return next(new UnprocessableEntityError({ message: 'First name, last name are required' }))
            }

            if (!nickname) {
                return next(new UnprocessableEntityError({ message: 'Nickname is required' }))
            }

            if (nickname.trim().split(' ').length >= 2) {
                return next(
                    new UnprocessableEntityError({
                        message: 'Nickname must be written without accents or special characters.',
                    }),
                )
            }

            const updateData = await UserService.updateUser({
                nickname,
                files,
                first_name,
                last_name,
                currentUserId: req.decoded.sub,
            })

            res.status(200).json({ data: updateData })
        } catch (error: any) {
            return next(error)
        }
    }

    // [PATCH] /auth/me/active-status
    async updateActiveStatus(req: IRequest, res: Response, next: NextFunction) {
        try {
            const { is_online } = req.body

            const updateData = await UserService.updateActiveStatus({
                isOnline: is_online,
                currentUserId: req.decoded.sub,
            })

            res.status(200).json({ data: updateData })
        } catch (error: any) {
            return next(error)
        }
    }
}

export default new MeController()
