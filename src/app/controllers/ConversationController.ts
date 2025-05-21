import { Response, NextFunction } from 'express'
import { IRequest } from '~/type'
import { BadRequest, ForBiddenError, InternalServerError } from '../errors/errors'
import Conversation from '../models/ConversationModel'
import { ConversationMember, Message, MessageStatus, User } from '../models'
import { Op } from 'sequelize'
import { sequelize } from '~/config/database'

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
                        include: [
                            {
                                model: User,
                                as: 'user',
                                required: true,
                                attributes: {
                                    exclude: ['password', 'email'],
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
                limit: Number(per_page),
                offset: (Number(page) - 1) * Number(per_page),
            })

            const is_read_sql = `
                CASE 
                    WHEN EXISTS (
                        SELECT 1
                        FROM message_statuses
                        WHERE message_statuses.message_id = Message.id
                        AND message_statuses.receiver_id = ${decoded.sub}
                        AND message_statuses.status = 'read'
                    ) THEN TRUE 
                    ELSE FALSE 
                END
            `

            const promises = conversations.map(async (conversation) => {
                const lastMessage = await Message.findOne<any>({
                    where: {
                        conversation_id: conversation.id,
                        [Op.not]: {
                            id: {
                                [Op.in]: sequelize.literal(`
                                    (
                                        SELECT message_id
                                        FROM message_statuses
                                        WHERE message_statuses.revoke_type = 'for-me'
                                        AND message_statuses.message_id = Message.id
                                        AND message_statuses.receiver_id = ${sequelize.escape(decoded.sub)}
                                    )
                                `),
                            },
                        },
                    },
                    attributes: {
                        exclude: ['content'],
                        include: [
                            [sequelize.literal(is_read_sql), 'is_read'],
                            [
                                sequelize.literal(`
                                    CASE 
                                        WHEN EXISTS (
                                            SELECT 1 FROM message_statuses 
                                            WHERE message_statuses.message_id = Message.id
                                            AND message_statuses.receiver_id = ${sequelize.escape(decoded.sub)}
                                            AND message_statuses.is_revoked = 1
                                        ) THEN NULL
                                        ELSE Message.content 
                                    END
                                `),
                                'content',
                            ],
                        ],
                    },
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
                            include: [
                                {
                                    model: User,
                                    as: 'receiver',
                                    attributes: {
                                        exclude: ['password', 'email'],
                                    },
                                },
                            ],
                        },
                    ],
                    order: [['created_at', 'DESC']],
                })

                if (lastMessage) {
                    conversation.dataValues.last_message = {
                        ...lastMessage.dataValues,
                        is_read: lastMessage.dataValues.is_read === 1,
                        content: lastMessage.dataValues.content ? lastMessage.dataValues.content : null,
                    }
                }
            })

            await Promise.all(promises)

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

            const conversation = await Conversation.findOne<any>({
                where: {
                    uuid,
                },
                include: [
                    {
                        model: ConversationMember,
                        as: 'conversation_members',
                        required: true,
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
