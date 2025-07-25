import { NextFunction, Response } from 'express'

import { UnprocessableEntityError } from '../errors/errors'
import MessageService from '../services/MessageService'
import { responseModel } from '../utils/responseModel'
import { IRequest } from '~/type'

class MessageController {
    // [GET] /api/messages/:conversationUuid
    async getMessages(req: IRequest, res: Response, next: NextFunction) {
        try {
            const { limit, offset } = req.query
            const decoded = req.decoded
            const conversationUuid = req.params.conversationUuid

            if (!conversationUuid) {
                return next(new UnprocessableEntityError({ message: 'Conversation uuid is required' }))
            }

            if (!limit || !offset) {
                return next(new UnprocessableEntityError({ message: 'Limit and offset are required' }))
            }

            const { messages, count } = await MessageService.getMessages({
                conversationUuid,
                currentUserId: decoded.sub,
                limit: Number(limit),
                offset: Number(offset),
            })

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
            return next(error)
        }
    }

    // [GET] /api/messages/:messageId/around
    async getAroundMessages(req: IRequest, res: Response, next: NextFunction) {
        try {
            const { messageId } = req.params
            const { conversation_uuid, limit = 20 } = req.query

            const decoded = req.decoded

            if (!messageId) {
                return next(new UnprocessableEntityError({ message: 'Message id is required' }))
            }

            if (!conversation_uuid) {
                return next(new UnprocessableEntityError({ message: 'Conversation uuid is required' }))
            }

            const { combinedMessages, totalMessages, targetMessageIndex, beforeCount } =
                await MessageService.getAroundMessages({
                    conversationUuid: conversation_uuid as string,
                    messageId: Number(messageId),
                    currentUserId: decoded.sub,
                    limit: Number(limit),
                })

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
            return next(error)
        }
    }

    // [GET] /api/messages/:conversationUuid/images
    async getMessageImages(req: IRequest, res: Response, next: NextFunction) {
        try {
            const { conversationUuid } = req.params
            const { page, per_page } = req.query

            const decoded = req.decoded

            if (!conversationUuid) {
                return next(new UnprocessableEntityError({ message: 'Conversation uuid is required' }))
            }

            if (!page || !per_page) {
                return next(new UnprocessableEntityError({ message: 'Page and per_page are required' }))
            }

            const { messageImages, count } = await MessageService.getMessageImages({
                conversationUuid,
                currentUserId: decoded.sub,
                per_page: Number(per_page),
                page: Number(page),
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
            return next(error)
        }
    }

    // [GET] /api/messages/:messageId/reactions
    async getReactions(req: IRequest, res: Response, next: NextFunction) {
        try {
            const { messageId } = req.params
            const { page, per_page, type = 'all' } = req.query

            if (!messageId) {
                return next(new UnprocessableEntityError({ message: 'Message id is required' }))
            }

            if (!page || !per_page) {
                return next(new UnprocessableEntityError({ message: 'Page and per_page are required' }))
            }

            const { reactions, count } = await MessageService.getReactions({
                messageId: Number(messageId),
                type: type as string,
                per_page: Number(per_page),
                page: Number(page),
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
            return next(error)
        }
    }

    // [GET] /api/messages/:messageId/reaction/types
    async getReactionsTypes(req: IRequest, res: Response, next: NextFunction) {
        try {
            const { messageId } = req.params

            const types = await MessageService.getReactionsTypes({ messageId: Number(messageId) })

            res.json(types)
        } catch (error: any) {
            return next(error)
        }
    }

    // [PATCH] /api/messages/revoke
    async revokeMessage(req: IRequest, res: Response, next: NextFunction) {
        try {
            const { revoke_type, message_id, conversation_uuid } = req.body
            const decoded = req.decoded

            if (!revoke_type || !message_id) {
                return next(new UnprocessableEntityError({ message: 'Revoke type and message id are required' }))
            }

            if (!conversation_uuid) {
                return next(new UnprocessableEntityError({ message: 'Conversation uuid is required' }))
            }

            await MessageService.revokeMessage({
                revokeType: revoke_type as string,
                messageId: Number(message_id),
                conversationUuid: conversation_uuid as string,
                currentUserId: decoded.sub,
            })

            res.status(200).json({
                message: 'Message revoked successfully',
            })
        } catch (error: any) {
            return next(error)
        }
    }

    async searchMessages(req: IRequest, res: Response, next: NextFunction) {
        try {
            const { q, conversation_uuid, page, per_page } = req.query

            const decoded = req.decoded

            if (!q) {
                return next(new UnprocessableEntityError({ message: 'Query is required' }))
            }

            if (!conversation_uuid) {
                return next(new UnprocessableEntityError({ message: 'Conversation uuid is required' }))
            }

            if (!page || !per_page) {
                return next(new UnprocessableEntityError({ message: 'Page and per_page are required' }))
            }

            if (Number(page) < 1 || Number(per_page) < 1) {
                return next(new UnprocessableEntityError({ message: 'Page and per_page must be greater than 0' }))
            }

            const { messages, count } = await MessageService.searchMessages({
                q: q as string,
                conversationUuid: conversation_uuid as string,
                currentUserId: decoded.sub,
                page: Number(page),
                perPage: Number(per_page),
            })

            res.json(
                responseModel({
                    data: messages,
                    total: count,
                    count: messages.length,
                    current_page: Number(page),
                    total_pages: Math.ceil(count / Number(per_page)),
                    per_page: Number(per_page),
                }),
            )
        } catch (error: any) {
            return next(error)
        }
    }

    // [POST] /api/messages/link-preview
    async getLinkPreview(req: IRequest, res: Response, next: NextFunction) {
        try {
            const { urls } = req.body

            if (!urls) {
                return next(new UnprocessableEntityError({ message: 'Urls is required' }))
            }

            if (!Array.isArray(urls)) {
                return next(new UnprocessableEntityError({ message: 'Url must be an array' }))
            }

            const preview = await MessageService.getLinkPreviews(urls)

            const { results, ...meta } = preview

            res.json({ data: results, meta })
        } catch (error: any) {
            return next(error)
        }
    }

    // [GET] /api/messages/links
    async getLinks(req: IRequest, res: Response, next: NextFunction) {
        try {
            const { conversation_uuid, page, per_page } = req.query

            if (!conversation_uuid) {
                return next(new UnprocessableEntityError({ message: 'conversation_uuid is required' }))
            }

            const decoded = req.decoded

            if (!page || !per_page) {
                return next(new UnprocessableEntityError({ message: 'page and per_page are required' }))
            }

            const { linkPreviews, count } = await MessageService.getLinks({
                conversationUuid: conversation_uuid as string,
                page: Number(page),
                perPage: Number(per_page),
                currentUserId: decoded.sub,
            })

            res.json(
                responseModel({
                    data: linkPreviews.results,
                    total: count,
                    count: linkPreviews.results.length,
                    current_page: Number(page),
                    total_pages: Math.ceil(count / Number(per_page)),
                    per_page: Number(per_page),
                }),
            )
        } catch (error: any) {
            return next(error)
        }
    }
}

export default new MessageController()
