import { NextFunction, Request, Response } from 'express'
import cloudinary from '~/config/cloudinary'

import { User } from '../models'
import { InternalServerError, NotFoundError, BadRequest } from '../errors/errors'

class MeController {
    // [GET] /auth/me
    async getCurrentUser(req: Request, res: Response, next: NextFunction) {
        try {
            const decoded = req.decoded as { sub: number }

            console.log(decoded)

            if (!decoded) {
                return next(new NotFoundError({ message: 'User not found' }))
            }

            const user = await User.findOne<any>({
                where: {
                    id: decoded.sub,
                },
            })

            if (!user) {
                return next(new NotFoundError({ message: 'User not found' }))
            }

            res.json({ data: user })
        } catch (error: any) {
            return next(new InternalServerError({ message: error.message }))
        }
    }

    // [POST] /auth/me/update
    async updateCurrentUser(req: Request, res: Response, next: NextFunction) {
        try {
            const file = req.file

            const { first_name, last_name, nickname } = req.body

            if (!first_name || !last_name || !nickname) {
                return next(new BadRequest({ message: 'First name, last name, nickname are required' }))
            }

            if (nickname.trim().split(' ').length > 2) {
                return next(new BadRequest({ message: 'Nickname must be in the format: first last' }))
            }

            if (!file) {
                try {
                    await User.update({ first_name, last_name, nickname }, { where: { id: req.decoded.sub } })

                    res.sendStatus(200)
                    return
                } catch (error: any) {
                    return next(new InternalServerError({ message: error.message }))
                }
            }

            cloudinary.v2.uploader
                .upload_stream(
                    { resource_type: 'image', folder: 'chat-app', public_id: req.decoded.sub },
                    async (error, resolve) => {
                        if (error) {
                            console.error(error)
                            return next(new InternalServerError({ message: error.message }))
                        }

                        try {
                            await User.update(
                                { first_name, last_name, nickname, avatar: resolve?.secure_url },
                                { where: { id: req.decoded.sub } },
                            )

                            res.sendStatus(200)
                        } catch (error: any) {
                            return next(new InternalServerError({ message: error.message }))
                        }
                    },
                )
                .end(file.buffer)
        } catch (error: any) {
            return next(new InternalServerError({ message: error.message }))
        }
    }
}

export default new MeController()
