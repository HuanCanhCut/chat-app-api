import { Response, NextFunction } from 'express'

import { BadRequest, InternalServerError, NotFoundError } from '../errors/errors'
import { Friendships, User } from '../models'
import { Sequelize } from 'sequelize'
import { Op } from 'sequelize'
import { IRequest } from '~/type'
import checkIsFriend from '../utils/isFriend'
import sentMakeFriendRequest from '../utils/sentMakeFriendRequest'

class UserController {
    // [GET] /user/:nickname
    async getAnUser(req: IRequest, res: Response, next: NextFunction) {
        try {
            const { nickname } = req.params

            const decoded = req.decoded

            if (!nickname) {
                return next(new BadRequest({ message: 'Nickname is required' }))
            }

            if (!nickname.startsWith('@')) {
                return next(new BadRequest({ message: 'Nickname must start with @' }))
            }

            const user = await User.findOne({
                where: { nickname: nickname.slice(1).toLowerCase() },
            })

            if (!user) {
                return next(new NotFoundError({ message: 'User not found' }))
            }

            const isFriend = await checkIsFriend(decoded.sub, Number(user.id))
            user.dataValues.is_friend = isFriend

            // Kiểm tra xem người dùng đã gửi lời mời kết bạn hay chưa
            if (user.id !== decoded.sub && !isFriend) {
                if (!user.id) {
                    return next(new InternalServerError({ message: 'User id is undefined' }))
                }
                user.dataValues.sent_friend_request = (await sentMakeFriendRequest(decoded.sub, user.id)) ? true : false
            }

            res.json({ data: user })
        } catch (error: any) {
            return next(new InternalServerError({ message: error.message }))
        }
    }

    // [POST] /user/friend-invitation?page=&per_page=
    async getFriendInvitation(req: IRequest, res: Response, next: NextFunction) {
        try {
            const decoded = req.decoded
            const { page, per_page } = req.query

            if (!page || !per_page) {
                return next(new BadRequest({ message: 'Page and per_page are required' }))
            }

            // Danh sách lời mời kết bạn
            const { rows: friendInvitations, count } = await Friendships.findAndCountAll<any>({
                where: {
                    [Op.and]: [{ status: 'pending' }, { friend_id: decoded.sub }],
                },
                include: {
                    model: User,
                    as: 'user',
                    required: true,
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
                        total: count,
                        count: friendInvitations.length,
                        per_page: Number(per_page),
                        current_page: Number(page),
                        total_pages: Math.ceil(count / Number(per_page)),
                    },
                },
            })
        } catch (error: any) {
            return next(new InternalServerError({ message: error.message }))
        }
    }
}

export default new UserController()
