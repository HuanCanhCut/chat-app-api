import { Response, NextFunction } from 'express'

import { BadRequest, InternalServerError, NotFoundError } from '../errors/errors'
import { User } from '../models'
import { IRequest } from '~/type'
import checkIsFriend from '../utils/isFriend'
import sentMakeFriendRequest from '../utils/sentMakeFriendRequest'
import { QueryTypes } from 'sequelize'
import { sequelize } from '~/config/db'

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

            const [isFriend, friendRequest] = await Promise.all([
                checkIsFriend(decoded.sub, Number(user.id)),
                sentMakeFriendRequest({
                    userId: Number(user.id),
                    friendId: decoded.sub,
                }),
            ])

            if (decoded.sub !== Number(user.id)) {
                user.dataValues.is_friend = isFriend
                user.dataValues.friend_request = friendRequest ? true : false
            }

            // Kiểm tra xem người dùng đã gửi lời mời kết bạn hay chưa
            if (user.id !== decoded.sub && !isFriend && !friendRequest) {
                if (!user.id) {
                    return next(new InternalServerError({ message: 'User id is undefined' }))
                }
                user.dataValues.sent_friend_request = (await sentMakeFriendRequest({
                    userId: decoded.sub,
                    friendId: user.id,
                }))
                    ? true
                    : false
            }

            res.json({ data: user })
        } catch (error: any) {
            return next(new InternalServerError({ message: error.message }))
        }
    }

    async searchUser(req: IRequest, res: Response, next: NextFunction) {
        try {
            const { q, per_page } = req.query

            if (!q || !per_page) {
                return next(new BadRequest({ message: 'Query and per_page are required' }))
            }

            const query = `
                        SELECT 
                            id, full_name, nickname, avatar, first_name, last_name, uuid, cover_photo, created_at, updated_at 
                        FROM 
                            users 
                        WHERE MATCH (full_name) AGAINST (:search IN NATURAL LANGUAGE MODE)
                        LIMIT :per_page
                        `

            const users = await sequelize.query(query, {
                replacements: { search: q, per_page: Number(per_page) },
                type: QueryTypes.SELECT,
            })

            res.json({ data: users })
        } catch (error: any) {
            return next(new InternalServerError({ message: error.message }))
        }
    }
}

export default new UserController()
