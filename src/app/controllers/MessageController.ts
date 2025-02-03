import { Response, NextFunction } from 'express'
import { IRequest } from '~/type'
import { BadRequest, ForBiddenError, InternalServerError, NotFoundError } from '../errors/errors'
import { Conversation, ConversationMember, Message, MessageStatus, User } from '../models'
import { responseModel } from '../utils/responseModel'
import { sequelize } from '~/config/db'

class MessageController {
    // [GET] /api/messages/:conversationUuid
    async getMessages(req: IRequest, res: Response, next: NextFunction) {
        try {
            const { page, per_page } = req.query
            const decoded = req.decoded
            const conversationUuid = req.params.conversationUuid

            if (!conversationUuid) {
                return next(new BadRequest({ message: 'Conversation uuid is required' }))
            }

            if (!page || !per_page) {
                return next(new BadRequest({ message: 'Page and per_page are required' }))
            }

            // check if user is a member of the conversation
            const hasMember = await Conversation.findOne({
                attributes: ['id'],
                where: {
                    uuid: conversationUuid,
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

            const { rows: messages, count } = await Message.findAndCountAll<any>({
                where: {
                    conversation_id: hasMember.id,
                },
                include: [
                    {
                        model: MessageStatus,
                        required: true,
                        as: 'message_status',
                        include: [
                            {
                                model: User,
                                as: 'receiver',
                                attributes: {
                                    include: [
                                        [
                                            sequelize.literal(`
                                                (
                                                    SELECT messages.id
                                                    FROM messages
                                                    INNER JOIN message_statuses ON message_statuses.message_id = messages.id
                                                    WHERE message_statuses.receiver_id = message_status.receiver_id AND
                                                        message_statuses.status = 'read' 
                                                        AND messages.conversation_id = ${hasMember.id}
                                                    ORDER BY messages.id DESC
                                                    LIMIT 1
                                                )
                                            `),
                                            'last_read_message_id',
                                        ],
                                    ],
                                    exclude: ['password', 'email'],
                                },
                            },
                        ],
                    },
                    {
                        model: User,
                        as: 'sender',
                        required: true,
                        attributes: {
                            exclude: ['password', 'email'],
                        },
                    },
                ],
                limit: Number(per_page),
                offset: (Number(page) - 1) * Number(per_page),
                order: [['id', 'DESC']],
            })

            const response = responseModel({
                data: messages,
                total: count,
                count: messages.length,
                current_page: Number(page),
                total_pages: Math.ceil(count / Number(per_page)),
                per_page: Number(per_page),
            })

            res.json(response)
        } catch (error: any) {
            return next(new InternalServerError(error))
        }
    }

    async getMessageImages(req: IRequest, res: Response, next: NextFunction) {
        try {
            const { conversationUuid } = req.params
            const { page, per_page } = req.query

            if (!conversationUuid) {
                return next(new BadRequest({ message: 'Conversation uuid is required' }))
            }

            if (!page || !per_page) {
                return next(new BadRequest({ message: 'Page and per_page are required' }))
            }

            const conversation = await Conversation.findOne({
                attributes: ['id'],
                where: {
                    uuid: conversationUuid,
                },
            })

            if (!conversation) {
                return next(new NotFoundError({ message: 'Conversation not found' }))
            }

            const { rows: messageImages, count } = await Message.findAndCountAll({
                where: {
                    type: 'image',
                    conversation_id: conversation.id,
                },
                limit: Number(per_page),
                offset: (Number(page) - 1) * Number(per_page),
                order: [['id', 'ASC']],
            })

            const response = responseModel({
                data: messageImages,
                total: count,
                count: messageImages.length,
                current_page: Number(page),
                total_pages: Math.ceil(count / Number(per_page)),
                per_page: Number(per_page),
            })

            res.json(response)
        } catch (error: any) {
            return next(new InternalServerError(error))
        }
    }
}

export default new MessageController()
