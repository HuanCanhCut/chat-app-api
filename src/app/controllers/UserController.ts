import { NextFunction, Request, Response } from 'express'
import { User } from '../models'
import { InternalServerError, NotFoundError, BadRequest } from '../errors/errors'

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

            res.json({ user })
        } catch (error: any) {
            return next(new InternalServerError({ message: error.message }))
        }
    }
}

export default new UserController()
