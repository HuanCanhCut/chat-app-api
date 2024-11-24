import { Response, NextFunction } from 'express'
import { Op, QueryTypes } from 'sequelize'

import { BadRequest, InternalServerError, NotFoundError } from '../errors/errors'
import { Conversation, ConversationMember, Message, User } from '../models'
import { IRequest } from '~/type'
import checkIsFriend from '../utils/isFriend'
import sentMakeFriendRequest from '../utils/sentMakeFriendRequest'
import { sequelize } from '~/config/db'
import SearchHistory from '../models/SearchHistoryModel'

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

                if (isFriend) {
                    const conversation = await Conversation.findOne({
                        where: {
                            is_group: false,
                        },
                        include: [
                            {
                                model: ConversationMember,
                                as: 'conversation_members',
                                required: true,
                                where: { user_id: decoded.sub },
                            },
                            {
                                model: ConversationMember,
                                as: 'conversation_members',
                                required: true,
                                where: { user_id: Number(user.id) },
                            },
                        ],
                    })
                    if (conversation) {
                        user.dataValues.conversation = conversation
                    }
                }
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
            const { q, type } = req.query

            if (!q || !type) {
                return next(new BadRequest({ message: 'Query and type are required' }))
            }

            if (type !== 'less' && type !== 'more') {
                return next(new BadRequest({ message: 'Type must be less or more' }))
            }

            const query = `
                        SELECT 
                            id, full_name, nickname, avatar, first_name, last_name, uuid, cover_photo, created_at, updated_at 
                        FROM 
                            users 
                        WHERE MATCH (full_name, nickname) AGAINST (:search IN NATURAL LANGUAGE MODE)
                        OR full_name LIKE '%${q}%'
                        OR nickname LIKE '%${q}%'
                        LIMIT :per_page
                        `

            const users = await sequelize.query(query, {
                replacements: { search: q, per_page: type === 'less' ? 8 : 15 },
                type: QueryTypes.SELECT,
            })

            res.json({ data: users })
        } catch (error: any) {
            return next(new InternalServerError({ message: error.message }))
        }
    }

    async setSearchHistory(req: IRequest, res: Response, next: NextFunction) {
        try {
            const decoded = req.decoded

            const { user_search_id } = req.body

            if (!user_search_id) {
                return next(new BadRequest({ message: 'User search id is required' }))
            }

            const userSearchExist = await User.findByPk(user_search_id)

            if (!userSearchExist) {
                return next(new NotFoundError({ message: 'User search not found' }))
            }

            const searchHistoryExist = await SearchHistory.findOne({
                where: { user_id: decoded.sub, user_search_id },
            })

            if (!searchHistoryExist) {
                await SearchHistory.create({
                    user_id: decoded.sub,
                    user_search_id,
                })
            }

            res.sendStatus(204)
        } catch (error: any) {
            return next(new InternalServerError({ message: error.message }))
        }
    }

    async getSearchHistory(req: IRequest, res: Response, next: NextFunction) {
        try {
            const decoded = req.decoded

            const searchHistory = await SearchHistory.findAll({
                where: { user_id: decoded.sub },
                include: {
                    model: User,
                    as: 'user_search',
                    required: true,
                    attributes: {
                        exclude: ['password', 'email'],
                    },
                },
                limit: 8,
            })

            res.json({ data: searchHistory })
        } catch (error: any) {
            return next(new InternalServerError({ message: error.message }))
        }
    }

    async getConversation(req: IRequest, res: Response, next: NextFunction) {
        try {
            const decoded = req.decoded

            const { page, per_page } = req.query

            if (!page || !per_page) {
                return next(new BadRequest({ message: 'Page and per page are required' }))
            }

            const conversations = await Conversation.findAll({
                include: [
                    {
                        model: ConversationMember,
                        as: 'conversation_members',
                        required: true,
                        include: [
                            {
                                model: User,
                                as: 'user',
                                required: true,
                                attributes: {
                                    exclude: ['password', 'email'],
                                },
                                where: {
                                    id: {
                                        [Op.ne]: decoded.sub,
                                    },
                                },
                            },
                        ],
                    },
                    {
                        model: Message,
                        as: 'messages',
                        required: false,
                    },
                ],
                where: {
                    id: {
                        [Op.in]: sequelize.literal(`(
                            SELECT conversation_id 
                            FROM conversation_members 
                            WHERE user_id = ${decoded.sub}
                        )`),
                    },
                },
                order: [[{ model: Message, as: 'messages' }, 'created_at', 'DESC']], // Sắp xếp theo tin nhắn mới nhất
            })

            res.json({ data: conversations })
        } catch (error: any) {
            return next(new InternalServerError({ message: error.message }))
        }
    }
}

export default new UserController()
