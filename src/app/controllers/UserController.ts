import { Request, Response, NextFunction } from 'express'

import { BadRequest, InternalServerError, NotFoundError, UnauthorizedError } from '../errors/errors'
import { Friendships, User } from '../models'
import { QueryTypes, Sequelize } from 'sequelize'
import { sequelize } from '~/config/db'
import { Op } from 'sequelize'

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

            const decoded = req.decoded

            if (!decoded) {
                return next(new UnauthorizedError({ message: 'Unauthorized' }))
            }

            if (!nickname) {
                return next(new BadRequest({ message: 'Nickname is required' }))
            }

            const user = await User.findOne<any>({
                where: { nickname: nickname.slice(1).toLowerCase() },
            })

            if (!user) {
                return next(new NotFoundError({ message: 'User not found' }))
            }

            const isFriend = await this.isFriend(decoded.sub, user.id)
            user.dataValues.isFriend = isFriend

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

            const hasUser = await User.findOne<any>({ where: { id } })

            if (!hasUser) {
                return next(new NotFoundError({ message: 'User not found' }))
            }

            if (hasUser.id === decoded.sub) {
                return next(new BadRequest({ message: 'You cannot add yourself as a friend' }))
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

    // [GET] /users?page=&per_page=
    async getAllFriends(req: Request, res: Response, next: NextFunction) {
        try {
            const { page, per_page } = req.query

            const decoded = req.decoded

            if (!decoded) {
                return next(new UnauthorizedError({ message: 'Unauthorized' }))
            }

            if (!page || !per_page) {
                return next(new BadRequest({ message: 'Page and per_page are required' }))
            }

            const query = `
                SELECT 
                    users.*
                FROM 
                    friendships
                JOIN 
                    users 
                    ON 
                        (users.id = friendships.friend_id AND friendships.user_id = ${decoded.sub}) 
                    OR 
                        (users.id = friendships.user_id AND friendships.friend_id = ${decoded.sub})
                    WHERE 
                        friendships.status = 'accepted'

                    LIMIT ${per_page} OFFSET ${(Number(page) - 1) * Number(per_page)};
            `

            const friends = await sequelize.query(query, {
                type: QueryTypes.SELECT,
            })

            res.json({
                data: friends,
                meta: {
                    pagination: {
                        count: friends.length,
                        per_page: Number(per_page),
                        current_page: Number(page),
                    },
                },
            })
        } catch (error: any) {
            return next(new InternalServerError({ message: error.message }))
        }
    }

    // [POST] /user/friend-invitation?page=&per_page=
    async getFriendInvitation(req: Request, res: Response, next: NextFunction) {
        try {
            const decoded = req.decoded
            const { page, per_page } = req.query

            if (!page || !per_page) {
                return next(new BadRequest({ message: 'Page and per_page are required' }))
            }

            if (!decoded) {
                return next(new UnauthorizedError({ message: 'Unauthorized' }))
            }

            // Danh sách lời mời kết bạn
            const friendInvitations = await Friendships.findAll<any>({
                where: {
                    [Op.and]: [{ status: 'pending' }, { friend_id: decoded.sub }],
                },
                include: {
                    model: User,
                    as: 'user',
                    where: {
                        id: Sequelize.col('Friendships.user_id'),
                    },
                },
                limit: Number(per_page),
                offset: (Number(page) - 1) * Number(per_page),
            })

            res.json({
                data: friendInvitations,
                meta: {
                    pagination: {
                        count: friendInvitations.length,
                        per_page: Number(per_page),
                        current_page: Number(page),
                    },
                },
            })
        } catch (error: any) {
            return next(new InternalServerError({ message: error.message }))
        }
    }
}

export default new UserController()
