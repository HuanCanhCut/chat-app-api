import { Response, NextFunction } from 'express'
import { IRequest } from '~/type'
import { BadRequest, InternalServerError } from '../errors/errors'
import Conversation from '../models/ConversationModel'
import { ConversationMember, User } from '../models'
import { Op } from 'sequelize'
import { sequelize } from '~/config/db'

class ConversationController {
    async getConversations(req: IRequest, res: Response, next: NextFunction) {
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
                attributes: {
                    include: [
                        [
                            sequelize.literal(`(
                                SELECT content
                                FROM messages
                                WHERE messages.conversation_id = Conversation.id
                                ORDER BY created_at DESC
                                LIMIT 1
                            )`),
                            'last_message_content',
                        ],
                        [
                            sequelize.literal(`(
                                SELECT created_at
                                FROM messages
                                WHERE messages.conversation_id = Conversation.id
                                ORDER BY created_at DESC
                                LIMIT 1
                            )`),
                            'last_message_time',
                        ],
                    ],
                },
                order: sequelize.literal(`(
                    SELECT MAX(created_at)
                    FROM messages
                    WHERE messages.conversation_id = Conversation.id
                ) DESC`), // Sắp xếp theo tin nhắn mới nhất
            })

            res.json({ data: conversations })
        } catch (error: any) {
            return next(new InternalServerError(error.message))
        }
    }
}

export default new ConversationController()
