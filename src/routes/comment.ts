import express from 'express'

import CommentController from '~/app/controllers/CommentController'
import { validate } from '~/app/middlewares/validate'
import { createCommentSchema, reactCommentSchema } from '~/app/validator/api/commentSchema'
import { idSchema } from '~/app/validator/api/common'
const router = express.Router()

router.get('/:id', validate(idSchema), CommentController.getCommentById)
router.post('/:id', validate(createCommentSchema), CommentController.createComment)
router.post('/:id/react', validate(reactCommentSchema), CommentController.reactComment)
router.delete('/:id/unreact', validate(idSchema), CommentController.unreactComment)

export default router
