import express from 'express'

import ReactionController from '~/app/controllers/ReactionController'
import { validate } from '~/app/middlewares/validate'
import { getReactionsTypesSchema } from '~/app/validator/api/reactionSchema'

const router = express.Router()

router.get(
    '/:reactionableId/:reactionableType/reaction/types',
    validate(getReactionsTypesSchema),
    ReactionController.getReactionsTypes,
)

router.get('/:reactionableId/:reactionableType/reactions', ReactionController.getReactions)

export default router
