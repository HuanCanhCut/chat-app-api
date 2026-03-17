import { AppError, InternalServerError } from '../errors/errors'
import { User } from '../models'
import Reaction from '../models/ReactionModel'
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
        } catch (error: any) {
            if (error instanceof AppError) {
                throw error
            }

            throw new InternalServerError({ message: error.message + ' ' + error.stack })
        }
    }
}

export default new ReactionService()
