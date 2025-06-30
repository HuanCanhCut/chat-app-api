import { NextFunction, Response } from 'express'

import { UnprocessableEntityError } from '../errors/errors'
import ConversationService from '../services/ConversationService'
import { IRequest } from '~/type'

class ConversationController {
    // [GET] /api/conversations
    async getConversations(req: IRequest, res: Response, next: NextFunction) {
        try {
            const decoded = req.decoded

            const { page, per_page } = req.query

            if (!page || !per_page) {
                return next(new UnprocessableEntityError({ message: 'Page and per page are required' }))
            }

            const conversations = await ConversationService.getConversations({
                currentUserId: decoded.sub,
                page: page as string,
                per_page: per_page as string,
            })

            res.json({ data: conversations })
        } catch (error: any) {
            return next(error)
        }
    }

    // [GET] /api/conversations/:uuid
    async getConversationByUuid(req: IRequest, res: Response, next: NextFunction) {
        try {
            const decoded = req.decoded

            const uuid = req.params.uuid

            const conversation = await ConversationService.getConversationByUuid({
                currentUserId: decoded.sub,
                uuid,
            })

            res.json({ data: conversation })
        } catch (error: any) {
            return next(error)
        }
    }

    // [GET] /api/conversations/search
    async searchConversation(req: IRequest, res: Response, next: NextFunction) {
        try {
            const decoded = req.decoded

            const { q } = req.query

            if (!q) {
                return next(new UnprocessableEntityError({ message: 'Search query is required' }))
            }

            const conversations = await ConversationService.searchConversation({
                currentUserId: decoded.sub,
                q: q as string,
            })

            res.json({ data: conversations })
        } catch (error: any) {
            return next(error)
        }
    }

    // [PATCH] /api/conversations/:uuid/rename
    async renameConversation(req: IRequest, res: Response, next: NextFunction) {
        try {
            const { uuid } = req.params
            const { name } = req.body

            const decoded = req.decoded

            if (!name) {
                return next(new UnprocessableEntityError({ message: 'Name is required' }))
            }

            if (!uuid) {
                return next(new UnprocessableEntityError({ message: 'UUID is required' }))
            }

            const updatedConversation = await ConversationService.renameConversation({
                currentUserId: decoded.sub,
                conversationUuid: uuid,
                conversationName: name,
            })

            res.json({ data: updatedConversation })
        } catch (error: any) {
            return next(error)
        }
    }

    // [PATCH] /api/conversations/:uuid/avatar
    async changeConversationAvatar(req: IRequest, res: Response, next: NextFunction) {
        try {
            const { uuid } = req.params
            const avatar = req.file
            const decoded = req.decoded

            if (!uuid) {
                return next(new UnprocessableEntityError({ message: 'Conversation uuid is required' }))
            }

            if (!avatar) {
                return next(new UnprocessableEntityError({ message: 'Avatar is required' }))
            }

            const updatedConversation = await ConversationService.changeConversationAvatar({
                currentUserId: decoded.sub,
                conversationUuid: uuid,
                avatar,
            })

            res.json({ data: updatedConversation })
        } catch (e: any) {
            return next(e)
        }
    }

    // [PATCH] /api/conversations/:uuid/theme
    async changeConversationTheme(req: IRequest, res: Response, next: NextFunction) {
        try {
            const { uuid } = req.params
            const { theme_id } = req.body

            const decoded = req.decoded

            if (!uuid) {
                return next(new UnprocessableEntityError({ message: 'Conversation uuid is required' }))
            }

            if (!theme_id) {
                return next(new UnprocessableEntityError({ message: 'Theme id is required' }))
            }

            const updatedConversation = await ConversationService.changeConversationTheme({
                currentUserId: decoded.sub,
                conversationUuid: uuid,
                themeId: theme_id,
            })

            res.json({ data: updatedConversation })
        } catch (e: any) {
            return next(e)
        }
    }
}

export default new ConversationController()
