import { Request, Response, NextFunction } from 'express'

import { BadRequest, InternalServerError, NotFoundError, UnauthorizedError } from '../errors/errors'
import { Friendships, User } from '../models'
import { QueryTypes } from 'sequelize'
import { sequelize } from '~/config/db'

class UserController {
    async isFriend(userId: string, friendId: string) {
        const query = `
            SELECT users.*
            FROM 
                friendships 
            JOIN 
                users
            ON 
                (users.id = friendships.friend_id AND friendships.user_id = ${userId}) 
            OR 
                (users.id = friendships.user_id AND friendships.friend_id = ${userId}) 
            WHERE 
                friendships.status = 'accepted' AND
                friendships.friend_id = ${friendId}
        `

        const isFriend = await sequelize.query(query, {
            type: QueryTypes.SELECT,
        })

        return isFriend.length > 0
    }

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

    // [GET] /user/:id/add
    async addFriend(req: Request, res: Response, next: NextFunction) {
        try {
            // id of user that want to add friend
            const { id: id } = req.params
            const decoded = req.decoded

            if (!decoded) {
                return next(new UnauthorizedError({ message: 'Unauthorized' }))
            }

            if (!id) {
                return next(new BadRequest({ message: 'User ID is required' }))
            }

            const hasUser = await User.findOne({ where: { id } })

            if (!hasUser) {
                return next(new NotFoundError({ message: 'User not found' }))
            }

            const isFriend = await this.isFriend(decoded.sub, id)

            if (isFriend) {
                return next(new BadRequest({ message: 'User is already your friend' }))
            }

            const newFriendship = await Friendships.create({
                user_id: decoded.sub,
                friend_id: id,
            })

            if (!newFriendship) {
                return next(new InternalServerError({ message: 'Failed to add friend' }))
            }

            res.sendStatus(201)
        } catch (error: any) {
            return next(new InternalServerError({ message: error.message }))
        }
    }
}

export default new UserController()
