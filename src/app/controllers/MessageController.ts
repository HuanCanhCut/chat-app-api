import { Response, NextFunction } from 'express'
import { IRequest } from '~/type'
import { BadRequest, ForBiddenError, InternalServerError, NotFoundError } from '../errors/errors'
import { Conversation, ConversationMember, Message, MessageStatus, User } from '../models'
import { responseModel } from '../utils/responseModel'
import { sequelize } from '~/config/database'
import MessageReaction from '../models/MessageReactionModel'
import { Op, QueryTypes } from 'sequelize'
import socketManager from '~/app/socket/socketManager'
import { SocketEvent } from '~/enum/socketEvent'

class MessageController {
    handleGetMessages = async ({
        conversationUuid,
        currentUserId,
        limit,
        offset,
        sort = 'DESC',
    }: {
        conversationUuid: string
        currentUserId: string
        limit: number
        offset: number
        sort?: 'ASC' | 'DESC'
    }) => {
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
                    user_id: currentUserId,
                },
            },
        })

        if (!hasMember) {
            throw new ForBiddenError({ message: 'Permission denied' })
        }

        const is_read_sql = `
            CASE 
                WHEN EXISTS (
                    SELECT 1
                    FROM message_statuses
                    WHERE message_statuses.message_id = Message.id
                    AND message_statuses.receiver_id = ${sequelize.escape(currentUserId)}
                    AND message_statuses.status = 'read'
                ) THEN TRUE 
                ELSE FALSE 
            END
        `

        const { rows: messages, count } = await Message.findAndCountAll<any>({
            distinct: true,
            where: {
                conversation_id: hasMember.id,
                // Get all messages except messages that have been revoked for-me by the current user
                [Op.not]: {
                    id: {
                        [Op.in]: sequelize.literal(`
                        (
                            SELECT message_id
                            FROM message_statuses
                            WHERE message_statuses.revoke_type = 'for-me'
                            AND message_statuses.message_id = Message.id
                            AND message_statuses.receiver_id = ${sequelize.escape(currentUserId)}
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
                                AND message_statuses.receiver_id = ${sequelize.escape(currentUserId)}
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
                    model: MessageStatus,
                    required: true,
                    as: 'message_status',
                    attributes: {
                        include: [
                            [
                                sequelize.literal(`
                                CASE 
                                    WHEN 
                                        message_status.receiver_id != ${sequelize.escape(currentUserId)} 
                                        AND message_status.revoke_type = 'for-me' 
                                    THEN 0
                                    ELSE message_status.is_revoked 
                                END
                                `),
                                'is_revoked',
                            ],
                            [
                                sequelize.literal(`
                                CASE 
                                    WHEN 
                                        message_status.receiver_id != ${sequelize.escape(currentUserId)} 
                                        AND message_status.revoke_type = 'for-me'
                                    THEN NULL
                                    ELSE message_status.revoke_type 
                                END
                            `),
                                'revoke_type',
                            ],
                        ],
                    },
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
                                                AND (
                                                    message_statuses.is_revoked = 0
                                                    OR (
                                                        message_statuses.receiver_id != ${sequelize.escape(currentUserId)}
                                                        AND message_statuses.revoke_type = 'for-me'
                                                    )
                                                    OR (
                                                        message_statuses.revoke_type = 'for-other'
                                                    )
                                                )
                                                AND NOT EXISTS (
                                                    SELECT 1
                                                    FROM message_statuses
                                                    WHERE message_statuses.message_id = messages.id
                                                    AND message_statuses.is_revoked = 1
                                                    AND message_statuses.receiver_id = ${sequelize.escape(currentUserId)}
                                                    AND message_statuses.revoke_type = 'for-me'
                                                )
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
                {
                    model: Message,
                    as: 'parent',
                    required: false,
                    where: {
                        // Get all messages except messages that have been revoked for-me by the current user
                        [Op.not]: {
                            id: {
                                [Op.in]: sequelize.literal(`
                                (
                                    SELECT message_id
                                    FROM message_statuses
                                    WHERE message_statuses.revoke_type = 'for-me'
                                    AND message_statuses.message_id = parent.id
                                    AND message_statuses.receiver_id = ${sequelize.escape(currentUserId)}
                                )
                            `),
                            },
                        },
                    },
                    attributes: {
                        exclude: ['content'],
                        include: [
                            [
                                sequelize.literal(`
                                CASE
                                    WHEN EXISTS (
                                        SELECT 1 FROM message_statuses
                                        WHERE message_statuses.message_id = parent.id
                                        AND message_statuses.receiver_id = ${sequelize.escape(currentUserId)}
                                        AND message_statuses.is_revoked = 1
                                    ) THEN NULL
                                    ELSE parent.content
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
                            attributes: { exclude: ['password', 'email'] },
                        },
                    ],
                },
            ],
            limit,
            offset,
            order: [['id', sort]],
        })

        const promises = messages.map(async (message) => {
            const [top_reactions, total_reactions] = await Promise.all([
                MessageReaction.findAll({
                    where: {
                        message_id: message.id,
                    },
                    include: [
                        {
                            model: User,
                            as: 'user_reaction',
                            attributes: {
                                exclude: ['password', 'email'],
                            },
                        },
                    ],
                    attributes: ['react'],
                    group: ['react'],
                    order: [[sequelize.fn('COUNT', sequelize.col('react')), 'DESC']],
                    limit: 2,
                }),

                MessageReaction.count({
                    where: {
                        message_id: message.id,
                    },
                }),
            ])

            if (top_reactions.length > 0) {
                message.dataValues.top_reactions = top_reactions.map((reaction) => {
                    return {
                        react: reaction.react,
                        user_reaction: reaction.user_reaction,
                    }
                })
            }

            message.dataValues.total_reactions = total_reactions

            return message
        })

        await Promise.all(promises)

        // Manually set parent to null for messages with for-other revoke type
        for (const message of messages) {
            if (
                message.message_status &&
                message.message_status.some((status: any) => status.is_revoked && status.revoke_type === 'for-other')
            ) {
                message.dataValues.parent = null
            }
        }

        return {
            messages,
            count,
        }
    }

    // [GET] /api/messages/:conversationUuid
    async getMessages(req: IRequest, res: Response, next: NextFunction) {
        try {
            const { limit, offset } = req.query
            const decoded = req.decoded
            const conversationUuid = req.params.conversationUuid

            if (!conversationUuid) {
                return next(new BadRequest({ message: 'Conversation uuid is required' }))
            }

            if (!limit || !offset) {
                return next(new BadRequest({ message: 'Limit and offset are required' }))
            }

            const messagesData = await this.handleGetMessages({
                conversationUuid,
                currentUserId: decoded.sub,
                limit: Number(limit),
                offset: Number(offset),
            })

            if (!messagesData) {
                return next(new ForBiddenError({ message: 'Permission denied' }))
            }

            const { messages, count } = messagesData

            res.json({
                data: messages,
                meta: {
                    pagination: {
                        total: count,
                        count: messages.length,
                        limit: Number(limit),
                        offset: Number(offset),
                    },
                },
            })
        } catch (error: any) {
            if (error instanceof ForBiddenError) {
                return next(error)
            }
            return next(new InternalServerError(error))
        }
    }

    // [GET] /api/messages/:messageId/around
    async getAroundMessages(req: IRequest, res: Response, next: NextFunction) {
        try {
            const { messageId } = req.params
            const { conversation_uuid, limit = 20 } = req.query

            const decoded = req.decoded

            if (!messageId) {
                return next(new BadRequest({ message: 'Message id is required' }))
            }

            if (!conversation_uuid) {
                return next(new BadRequest({ message: 'Conversation uuid is required' }))
            }

            const conversation = await Conversation.findOne({
                attributes: ['id'],
                where: {
                    uuid: conversation_uuid as string,
                },
            })

            if (!conversation) {
                return next(new NotFoundError({ message: 'Conversation not found' }))
            }

            const hasMessage = await Message.findByPk(messageId)

            if (!hasMessage) {
                return next(new NotFoundError({ message: 'Message not found' }))
            }

            // Tìm vị trí của tin nhắn hiện tại
            const targetMessageIndex = await Message.count({
                where: {
                    id: {
                        [Op.gt]: Number(messageId),
                    },
                    conversation_id: conversation.get('id'),
                },
            })

            // Tính toán số lượng tin nhắn cần lấy trước và sau
            const halfPerPage = Math.floor(Number(limit) / 2)
            const beforeCount = Math.min(halfPerPage, targetMessageIndex)
            const afterCount = Number(limit) - beforeCount - 1 // -1 cho tin nhắn hiện tại

            // Lấy tin nhắn trước, hiện tại và sau cùng lúc bằng Promise.all
            const [beforeMessages, currentMessageData, afterMessages] = await Promise.all([
                targetMessageIndex > 0
                    ? this.handleGetMessages({
                          conversationUuid: conversation_uuid as string,
                          currentUserId: decoded.sub,
                          limit: beforeCount,
                          offset: targetMessageIndex - beforeCount,
                      })
                    : Promise.resolve({ messages: [], count: 0 }),

                this.handleGetMessages({
                    conversationUuid: conversation_uuid as string,
                    currentUserId: decoded.sub,
                    limit: 1,
                    offset: targetMessageIndex,
                }),

                this.handleGetMessages({
                    conversationUuid: conversation_uuid as string,
                    currentUserId: decoded.sub,
                    limit: afterCount,
                    offset: targetMessageIndex + 1,
                }),
            ])

            // Kết hợp và sắp xếp tin nhắn
            const combinedMessages = [
                ...beforeMessages.messages,
                currentMessageData.messages[0],
                ...afterMessages.messages,
            ]

            const totalMessages = beforeMessages.count || afterMessages.count

            res.json({
                data: combinedMessages,
                meta: {
                    pagination: {
                        total: totalMessages,
                        count: combinedMessages.length,
                        limit: Number(limit),
                        offset: targetMessageIndex - beforeCount,
                    },
                },
            })
        } catch (error: any) {
            if (error instanceof ForBiddenError) {
                return next(error)
            }
            return next(new InternalServerError(error))
        }
    }

    // [GET] /api/messages/:conversationUuid/images
    async getMessageImages(req: IRequest, res: Response, next: NextFunction) {
        try {
            const { conversationUuid } = req.params
            const { page, per_page } = req.query

            const decoded = req.decoded

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
                distinct: true,
                where: {
                    type: 'image',
                    conversation_id: conversation.id,
                    [Op.not]: {
                        id: {
                            [Op.in]: sequelize.literal(`
                                (
                                    SELECT message_id 
                                    FROM message_statuses 
                                    WHERE message_statuses.is_revoked = 1
                                    AND message_statuses.message_id = Message.id
                                    AND message_statuses.receiver_id = ${sequelize.escape(decoded.sub)}
                                )
                            `),
                        },
                    },
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

    // [GET] /api/messages/:messageId/reactions
    async getReactions(req: IRequest, res: Response, next: NextFunction) {
        try {
            const { messageId } = req.params
            const { page, per_page, type = 'all' } = req.query

            if (!messageId) {
                return next(new BadRequest({ message: 'Message id is required' }))
            }

            if (!page || !per_page) {
                return next(new BadRequest({ message: 'Page and per_page are required' }))
            }

            const { rows: reactions, count } = await MessageReaction.findAndCountAll({
                distinct: true,
                where: {
                    message_id: messageId,
                    ...(type !== 'all' && {
                        react: type as string,
                    }),
                },
                include: [
                    {
                        model: User,
                        as: 'user_reaction',
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
                data: reactions,
                total: count,
                count: reactions.length,
                current_page: Number(page),
                total_pages: Math.ceil(count / Number(per_page)),
                per_page: Number(per_page),
            })

            res.json(response)
        } catch (error: any) {
            return next(new InternalServerError(error))
        }
    }

    // [GET] /api/messages/:messageId/reaction/types
    async getReactionsTypes(req: IRequest, res: Response, next: NextFunction) {
        try {
            const { messageId } = req.params

            const types = await MessageReaction.findAll({
                where: {
                    message_id: messageId,
                },
                attributes: ['react', [sequelize.fn('COUNT', sequelize.col('react')), 'count']],
                group: ['react'],
            })

            res.json(types)
        } catch (error: any) {
            return next(new InternalServerError(error))
        }
    }

    // [PATCH] /api/messages/revoke
    async revokeMessage(req: IRequest, res: Response, next: NextFunction) {
        try {
            const { revoke_type, message_id, conversation_uuid } = req.body
            const decoded = req.decoded

            if (!revoke_type || !message_id) {
                return next(new BadRequest({ message: 'Revoke type and message id are required' }))
            }

            if (!conversation_uuid) {
                return next(new BadRequest({ message: 'Conversation uuid is required' }))
            }

            let updateStatusQuery = ''

            switch (revoke_type) {
                case 'for-me':
                    updateStatusQuery = `
                        UPDATE message_statuses
                        JOIN messages ON messages.id = message_statuses.message_id
                        SET message_statuses.is_revoked = 1,
                            message_statuses.revoke_type = :revokeType
                        WHERE message_statuses.message_id = :messageId
                        AND message_statuses.receiver_id = :receiverId
                    `
                    break
                case 'for-other':
                    updateStatusQuery = `
                        UPDATE message_statuses
                        JOIN messages ON messages.id = message_statuses.message_id
                        SET message_statuses.is_revoked = 1,
                            message_statuses.revoke_type = :revokeType
                        WHERE message_statuses.revoke_type IS NULL
                        AND message_statuses.message_id = :messageId
                    `
                    break
                default:
                    break
            }

            if (updateStatusQuery === '') {
                return next(new BadRequest({ message: 'Invalid revoke type, revoke type is for-me or for-other' }))
            }

            const isMemberOfConversation = await Conversation.findOne({
                attributes: ['id'],
                where: {
                    uuid: conversation_uuid,
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

            if (!isMemberOfConversation) {
                return next(new ForBiddenError({ message: 'Permission denied' }))
            }

            const [, metadata] = await sequelize.query(updateStatusQuery, {
                replacements: {
                    revokeType: revoke_type,
                    messageId: message_id,
                    receiverId: decoded.sub,
                },
                type: QueryTypes.UPDATE,
            })

            if (metadata === 0) {
                return next(new BadRequest({ message: 'Message not found or already revoked' }))
            }

            if (revoke_type === 'for-other') {
                socketManager.io?.to(conversation_uuid).emit(SocketEvent.MESSAGE_REVOKE, {
                    message_id,
                    conversation_uuid,
                })
            }

            res.status(200).json({
                message: 'Message revoked successfully',
            })
        } catch (error: any) {
            return next(new InternalServerError(error))
        }
    }
}

export default new MessageController()
