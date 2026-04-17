import { Op } from 'sequelize'

import { User } from '../models'
import Reaction from '../models/ReactionModel'
import { handleServiceError } from '../utils/handleServiceError'
import { sequelize } from '~/config/database'
import { ReactionableType } from '~/types/reactionType'

class ReactionService {
    getReactionsByReactableId = async ({
        reactionable_id,
        reactionable_type,
        page,
        per_page,
        type,
    }: {
        reactionable_id: number
        reactionable_type: ReactionableType
        page: number
        per_page: number
        type?: string
    }) => {
        try {
            const { rows: reactions, count } = await Reaction.findAndCountAll({
                distinct: true,
                where: {
                    reactionable_id: reactionable_id,
                    reactionable_type,
                    ...(type !== 'all' && {
                        react: type as string,
                    }),
                },
                include: [
                    {
                        model: User,
                        as: 'user_reaction',
                        required: true,
                    },
                ],
                limit: Number(per_page),
                offset: (Number(page) - 1) * Number(per_page),
                order: [['id', 'DESC']],
            })

            return {
                reactions,
                count,
            }
        } catch (error) {
            return handleServiceError(error)
        }
    }

    async getReactionsTypes({
        reactionableId,
        reactionableType,
    }: {
        reactionableId: number
        reactionableType: ReactionableType
    }) {
        try {
            const types = await Reaction.findAll({
                where: {
                    reactionable_id: reactionableId,
                    reactionable_type: reactionableType,
                },
                attributes: ['react', [sequelize.fn('COUNT', sequelize.col('react')), 'count']],
                group: ['react'],
            })

            return types
        } catch (error) {
            return handleServiceError(error)
        }
    }

    async getTopReactions({
        reactionableIds,
        reactionableType,
        limit = 2,
    }: {
        reactionableIds: number[]
        reactionableType: ReactionableType
        limit: number
    }) {
        try {
            const topReactions = await Reaction.findAll({
                where: {
                    reactionable_id: {
                        [Op.in]: reactionableIds as number[],
                    },
                    reactionable_type: reactionableType,
                },
                attributes: ['react', 'reactionable_id'],
                group: ['react', 'reactionable_id'],
                order: [[sequelize.fn('COUNT', sequelize.col('react')), 'DESC']],
            })

            const topReactionsMap = topReactions.reduce((acc: Record<string, Reaction[]>, curr) => {
                if (!acc[curr.reactionable_id]) {
                    acc[curr.reactionable_id] = []
                }
                if (acc[curr.reactionable_id].length <= limit) {
                    acc[curr.reactionable_id].push(curr)
                }
                return acc
            }, {})

            return topReactionsMap
        } catch (error) {
            return handleServiceError(error)
        }
    }
}

export default new ReactionService()
