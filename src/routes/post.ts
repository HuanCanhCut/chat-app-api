import express from 'express'

import PostController from '~/app/controllers/PostController'
import { validate } from '~/app/middlewares/validate'
import { idSchema, paginationSchema } from '~/app/validator/api/common'
import {
    createPostSchema,
    getPostCommentSchema,
    getPostReactionsSchema,
    reactPostSchema,
} from '~/app/validator/api/postSchema'

const router = express.Router()

router.get('/', validate(paginationSchema), PostController.getPosts)
router.post('/', validate(createPostSchema), PostController.createPost)
router.get('/:id/reactions', validate(getPostReactionsSchema), PostController.getPostReactions)
router.get('/:id/comments', validate(getPostCommentSchema), PostController.getPostComments)
router.post('/:id/react', validate(reactPostSchema), PostController.reactPost)
router.delete('/:id/unreact', validate(idSchema), PostController.unreactPost)

export default router
