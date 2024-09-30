import { Request, Response, NextFunction } from 'express'

import { BadRequest, InternalServerError, NotFoundError } from '../errors/errors'
import { User } from '../models'

class UserController {
    // [GET] /user/:nickname
    async getAnUser(req: Request, res: Response, next: NextFunction) {
        try {
            const { nickname } = req.params

            if (!nickname) {
                return next(new BadRequest({ message: 'Nickname is required' }))
            }

            const user = await User.findOne({
                where: { nickname: nickname.slice(1).toLowerCase() },
            })

            if (!user) {
                return next(new NotFoundError({ message: 'User not found' }))
            }

            res.json({ data: user })
        } catch (error: any) {
            return next(new InternalServerError({ message: error.message }))
        }
    }
}

export default new UserController()
