import { NextFunction, Response } from 'express'

import ReactionService from '../services/ReactionService'
import { responseModel } from '../utils/responseModel'
import { GetReactionsRequest, GetReactionsTypesRequest } from '../validator/api/reactionSchema'

class ReactionController {
    // [GET] /api/messages/:reactionableId/:reactionableType/reaction/types
    getReactionsTypes = async (req: GetReactionsTypesRequest, res: Response, next: NextFunction) => {
        try {
            const { reactionableId, reactionableType } = req.params

            const types = await ReactionService.getReactionsTypes({
                reactionableId: Number(reactionableId),
                reactionableType,
            })

            res.json(types)
        } catch (error: any) {
            return next(error)
        }
    }

    // [GET] /api/messages/:reactionableId/:reactionableType/reactions
    getReactions = async (req: GetReactionsRequest, res: Response, next: NextFunction) => {
        try {
            const { reactionableId, reactionableType } = req.params
            const { page, per_page, type = 'all' } = req.query

            const { reactions, count } = await ReactionService.getReactionsByReactableId({
                reactionable_id: Number(reactionableId),
                reactionable_type: reactionableType,
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
}

export default new ReactionController()
