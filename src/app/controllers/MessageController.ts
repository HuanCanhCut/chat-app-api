import { Response, NextFunction } from 'express'
import { IRequest } from '~/type'
import { BadRequest, ForBiddenError, InternalServerError } from '../errors/errors'
import { Conversation, ConversationMember, Message, MessageStatus, User } from '../models'
import { responseModel } from '../utils/responseMode'

class MessageController {
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

            const { rows: messages, count } = await Message.findAndCountAll({
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
                            },
                        ],
                    },
                    {
                        model: User,
                        as: 'sender',
                        required: true,
                    },
                ],
                limit: Number(per_page),
                offset: (Number(page) - 1) * Number(per_page),
                order: [['created_at', 'DESC']], // Changed order to DESC to get the latest messages
            })

            const response = responseModel({
                data: messages,
                total: count,
                count,
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
