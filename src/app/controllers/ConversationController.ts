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
}

export default new ConversationController()
