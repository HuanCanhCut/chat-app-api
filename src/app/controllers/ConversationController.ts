import { Response, NextFunction } from 'express'
import { IRequest } from '~/type'
import { BadRequest, ForBiddenError, InternalServerError } from '../errors/errors'
import Conversation from '../models/ConversationModel'
import { ConversationMember, Message, MessageStatus, User } from '../models'
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
                    {
                        model: Message,
                        as: 'messages',
                        required: true,
                        include: [
                            {
                                model: User,
                                as: 'sender',
                                required: true,
                                attributes: {
                                    exclude: ['password', 'email'],
                                },
                            },
                            {
                                model: MessageStatus,
                                as: 'message_status',
                                required: true,
                            },
                        ],
                        // Truy vấn để lấy tin nhắn mới nhất
                        limit: 1, // chỉ lấy tin nhắn mới nhất
                        order: [['created_at', 'DESC']], // sắp xếp tin nhắn mới nhất
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
                // Sắp xếp các cuộc trò chuyện theo thời gian của tin nhắn mới nhất
                order: [
                    sequelize.literal(`(
                        SELECT MAX(messages.created_at)
                        FROM messages
                        WHERE messages.conversation_id = Conversation.id
                    ) DESC`), // Sắp xếp theo tin nhắn mới nhất
                ],
                // Lọc chỉ những cuộc trò chuyện có ít nhất 1 tin nhắn
                having: sequelize.literal(`EXISTS (
                    SELECT 1
                    FROM messages
                    WHERE messages.conversation_id = Conversation.id
                )`),
            })

            res.json({ data: conversations })
        } catch (error: any) {
            return next(new InternalServerError(error))
        }
    }

    async getConversationByUuid(req: IRequest, res: Response, next: NextFunction) {
        try {
            const decoded = req.decoded

            const uuid = req.params.uuid

            // check if user is a member of the conversation
            const hasMember = await Conversation.findOne({
                attributes: ['id'],
                where: {
                    uuid: uuid,
                },
                include: {
                    model: ConversationMember,
                    as: 'conversation_members',
                    attributes: ['id'],
                    where: {
                        user_id: decoded.sub,
                    },
                },
            })

            if (!hasMember) {
                return next(new ForBiddenError({ message: 'Permission denied' }))
            }

            const conversation = await Conversation.findOne({
                where: {
                    uuid,
                },
                include: [
                    {
                        model: ConversationMember,
                        as: 'conversation_members',
                        required: true,
                        where: {
                            user_id: {
                                [Op.ne]: decoded.sub,
                            },
                        },
                        include: [
                            {
                                model: User,
                                as: 'user',
                                attributes: {
                                    exclude: ['password', 'email'],
                                },
                            },
                        ],
                    },
                ],
            })

            res.json({ data: conversation })
        } catch (error: any) {
            return next(new InternalServerError(error))
        }
    }
}

export default new ConversationController()
